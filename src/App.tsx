import React, { useState, useEffect, useMemo } from 'react';
import { Wine, Spirit, Adega, Consumption, SpiritConsumption } from './types';
import { sbGet, sbUpsert, sbPatch, sbDel, wineFromDB, spiritFromDB, consumptionFromDB, spiritConsumptionFromDB, consumptionToDB, spiritConsumptionToDB, sbLogin, wineToDB, spiritToDB } from './lib/supabase';
import { LogIn, User, Wine as WineIcon, History, RefreshCw, Plus, Mic, Package, Trash2, BookOpen, GlassWater, Settings, X, Search, LogOut, Database, Camera, Star, ArrowLeft, LayoutGrid, BarChart3, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryGrid } from './components/InventoryGrid';
import { generateExpertSummaryGemini } from './lib/ai';
import { DrinkModal } from './components/DrinkModal';
import { VoiceModal } from './components/VoiceModal';
import { ConsumptionCard } from './components/ConsumptionCard';
import { StockModal } from './components/StockModal';
import { ReportsModal } from './components/ReportsModal';
import { StatsModal } from './components/StatsModal';
import { ItemModal } from './components/ItemModal';
import { ImportPhotosModal } from './components/ImportPhotosModal';
import { AnalysisModal } from './components/AnalysisModal';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<'cellar' | 'history'>('cellar');
  const [mode, setMode] = useState<'wines' | 'spirits'>('wines');
  const [adegas, setAdegas] = useState<Adega[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);
  const [spirits, setSpirits] = useState<Spirit[]>([]);
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  const [spiritCons, setSpiritCons] = useState<SpiritConsumption[]>([]);
  const [syncStatus, setSyncStatus] = useState<'ok' | 'saving' | 'error'>('ok');

  const [activeAdega, setActiveAdega] = useState<string>('all');
  
  const [groupBy, setGroupBy] = useState<string>('none');
  
  // Modal state
  const [activeModal, setActiveModal] = useState<'expert' | 'drink' | 'edit' | 'stock' | 'voice' | 'inout' | 'scan' | 'stats' | 'reports' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [scannedData, setScannedData] = useState<{ data: any, imageUrl: string } | null>(null);
  const [scanQueue, setScanQueue] = useState<{ data: any, imageUrl: string }[]>([]);

  useEffect(() => {
    const sessionTimer = setTimeout(() => {
      checkSession();
    }, 100);

    // Hide initial HTML loader if it exists
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
    }
    
    // Safety timeout: If still loading after 10 seconds, force show UI
    const safetyTimer = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('Loading taking too long, forcing UI state');
          return false;
        }
        return false;
      });
    }, 10000);
    
    // Auth error handling (JWT expired)
    const handleAuthError = () => {
      handleLogout();
      alert('Sua sessão expirou. Por favor, faça login novamente.');
    };
    window.addEventListener('adega-auth-error', handleAuthError);
    return () => {
      clearTimeout(sessionTimer);
      clearTimeout(safetyTimer);
      window.removeEventListener('adega-auth-error', handleAuthError);
    };
  }, []);

  async function checkSession() {
    try {
      const sessionString = localStorage.getItem('adega_session');
      if (sessionString) {
        let session;
        try {
          session = JSON.parse(sessionString);
        } catch (e) {
          console.error("Session parse error", e);
          handleLogout();
          setLoading(false);
          return;
        }

        if (!session || !session.expiry || Date.now() > session.expiry) {
          handleLogout();
          setLoading(false);
          return;
        }
        setIsAuthenticated(true);
        setIsAdmin(!!session.isAdmin);
        await boot();
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error('Session check failed:', e);
      handleLogout();
      setLoading(false);
    }
  }

  async function boot() {
    setSyncStatus('saving');
    try {
      const [adegasRaw, winesRaw, consRaw, spiritsRaw, sConsRaw] = await Promise.all([
        sbGet('adegas', 'select=id,name,emoji'),
        sbGet('wines', 'select=id,adega_id,name,producer,country,type,grape,vintage,qty,score,notes,expert_summary,personal_notes,image_url,drink_from,drink_until,entry_date,level'),
        sbGet('consumptions', 'select=id,wine_id,wine_snapshot,qty,level_before,level_after,date,occasion,score,notes'),
        sbGet('spirits', 'select=id,adega_id,name,producer,country,region,type,subtype,volume,aging,abv,level,qty,is_open,parent_id,score,notes,expert_summary,personal_notes,image_url'),
        sbGet('spirit_consumptions', 'select=id,spirit_id,spirit_snapshot,level_before,level_after,date,occasion,score,notes')
      ]);

      setAdegas(adegasRaw as Adega[]);
      setWines((winesRaw as any[]).map(wineFromDB));
      setConsumptions((consRaw as any[]).map(consumptionFromDB));
      setSpirits((spiritsRaw as any[]).map(spiritFromDB));
      setSpiritCons((sConsRaw as any[]).map(spiritConsumptionFromDB));
      
      console.log('Dados carregados:', { 
        adegas: (adegasRaw as any[]).length, 
        vinhos: (winesRaw as any[]).length, 
        spirits: (spiritsRaw as any[]).length 
      });
      
      setSyncStatus('ok');
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  }

  const itemsToShow = mode === 'wines' 
    ? (activeAdega === 'all' ? wines : wines.filter(w => w.adegaId === activeAdega)).filter(w => w.qty > 0)
    : (activeAdega === 'all' ? spirits : spirits.filter(s => s.adegaId === activeAdega));

  const groupedItems = useMemo(() => {
    if (groupBy === 'none') return { '': itemsToShow };
    const groups: Record<string, any[]> = {};
    itemsToShow.forEach(item => {
      const key = (item as any)[groupBy] || '—';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [itemsToShow, groupBy]);

  function handleAdminLogin(token: string) {
    setIsAuthenticated(true);
    setIsAdmin(true);
    localStorage.setItem('adega_session', JSON.stringify({ isAdmin: true, token, expiry: Date.now() + 86400000 }));
    boot();
  }

  function handleGuestLogin() {
    setIsAuthenticated(true);
    setIsAdmin(false);
    localStorage.setItem('adega_session', JSON.stringify({ isAdmin: false, expiry: Date.now() + 86400000 }));
    boot();
  }

  function handleLogout() {
    setIsAuthenticated(false);
    setIsAdmin(false);
    localStorage.removeItem('adega_session');
    setWines([]);
    setSpirits([]);
    setAdegas([]);
  }

  const handlers = {
    onDrink: (item: any) => { setSelectedItem(item); setActiveModal('drink'); },
    onEdit: (item: any) => { setSelectedItem(item); setActiveModal('edit'); },
    onDelete: (item: any) => { 
       if(confirm('Tem certeza que deseja excluir?')) {
         setSyncStatus('saving');
         const table = mode === 'wines' ? 'wines' : 'spirits';
         import('./lib/supabase').then(m => m.sbDel(table, item.id)).then(() => {
           if(mode === 'wines') setWines(prev => prev.filter(i => i.id !== item.id));
           else setSpirits(prev => prev.filter(i => i.id !== item.id));
           setSyncStatus('ok');
         });
       }
    },
    onStock: (item: any) => { setSelectedItem(item); setActiveModal('stock'); },
    onExpert: (item: any) => { setSelectedItem(item); setActiveModal('expert'); },
    onInout: () => setActiveModal('inout'),
  };

  async function handleDeleteConsumption(id: string, isSpirit: boolean) {
    if (!isAdmin) return;
    if (!confirm('Excluir este registro do histórico permanentemente?')) return;
    setSyncStatus('saving');
    try {
      await sbDel(isSpirit ? 'spirit_consumptions' : 'consumptions', id);
      boot();
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
    }
  }

  async function handleItemSave(data: any) {
    setSyncStatus('saving');
    try {
      const isSpirit = mode === 'spirits';
      const table = isSpirit ? 'spirits' : 'wines';
      const mapper = isSpirit ? spiritToDB : wineToDB;
      const dbData = mapper(data);
      
      await sbUpsert(table, dbData);
      
      if (isSpirit) {
        setSpirits(prev => {
          const exists = prev.find(i => i.id === data.id);
          if (exists) return prev.map(i => i.id === data.id ? data : i);
          return [data, ...prev];
        });
      } else {
        setWines(prev => {
          const exists = prev.find(i => i.id === data.id);
          if (exists) return prev.map(i => i.id === data.id ? data : i);
          return [data, ...prev];
        });
      }
      setSyncStatus('ok');
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
    }
  }

  async function handleDrinkSave(data: any) {
    if (!isAdmin) {
      const pass = prompt('Digite a senha de consumo para continuar:');
      if (pass?.toLowerCase().trim() !== 'membeca') {
        alert('Senha incorreta');
        return;
      }
    }
    setSyncStatus('saving');
    try {
      const isSpirit = mode === 'spirits';
      
      if (isSpirit) {
        const spirit = selectedItem as Spirit;
        const newLevel = data.levelAfter;
        
        // Update spirit level and mark as open
        await sbPatch('spirits', spirit.id, { 
          level: newLevel, 
          is_open: true,
          score: data.score 
        });
        
        // Save consumption
        const cons: SpiritConsumption = {
          id: crypto.randomUUID(),
          spiritId: spirit.id,
          spiritSnapshot: spirit,
          levelBefore: data.levelBefore,
          levelAfter: data.levelAfter,
          date: data.date,
          occasion: data.occasion,
          score: data.score,
          notes: data.notes
        };
        await sbUpsert('spirit_consumptions', spiritConsumptionToDB(cons));
        
        // Update local state
        setSpirits(prev => prev.map(s => s.id === spirit.id ? { ...s, level: newLevel, score: data.score, isOpen: true } : s));
        setSpiritCons(prev => [cons, ...prev]);
        
      } else {
        const wine = selectedItem as Wine;
        const fullyConsumed = data.qty > 0 || data.levelAfter === 0;
        const newQty = fullyConsumed ? Math.max(0, wine.qty - 1) : wine.qty;
        const newLevel = data.levelAfter;
        
        // Update wine
        await sbPatch('wines', wine.id, { 
          qty: newQty, 
          level: newLevel,
          score: data.score || wine.score
        });
        
        // Save consumption record
        const cons: Consumption = {
          id: crypto.randomUUID(),
          wineId: wine.id,
          wineSnapshot: wine,
          qty: fullyConsumed ? 1 : 0,
          levelBefore: data.levelBefore,
          levelAfter: data.levelAfter,
          date: data.date,
          occasion: data.occasion,
          score: data.score,
          notes: data.notes
        };
        await sbUpsert('consumptions', consumptionToDB(cons));
        
        // Update local
        setWines(prev => prev.map(w => w.id === wine.id ? { ...w, qty: newQty, level: newLevel, score: data.score || w.score } : w));
        setConsumptions(prev => [cons, ...prev]);
      }
      
      setSyncStatus('ok');
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
      throw e;
    }
  }

  async function handleSavePersonalNotes(id: string, notes: string) {
    if (!isAdmin) return;
    setSyncStatus('saving');
    try {
      const isSpirit = mode === 'spirits';
      const table = isSpirit ? 'spirits' : 'wines';
      await sbPatch(table, id, { personal_notes: notes });
      
      if (isSpirit) {
        setSpirits(prev => prev.map(s => s.id === id ? { ...s, personalNotes: notes } : s));
      } else {
        setWines(prev => prev.map(w => w.id === id ? { ...w, personalNotes: notes } : w));
      }
      setSyncStatus('ok');
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
      throw e;
    }
  }

  async function handleSaveExpertSummary(id: string, summary: string) {
    if (!isAdmin) return;
    setSyncStatus('saving');
    try {
      const isSpirit = mode === 'spirits';
      const table = isSpirit ? 'spirits' : 'wines';
      await sbPatch(table, id, { expert_summary: summary });
      
      if (isSpirit) {
        setSpirits(prev => prev.map(s => s.id === id ? { ...s, expertSummary: summary } : s));
      } else {
        setWines(prev => prev.map(w => w.id === id ? { ...w, expertSummary: summary } : w));
      }
      setSyncStatus('ok');
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
      throw e;
    }
  }

  async function handleUpdateScore(item: Wine | Spirit, newScore: number) {
    if (!isAdmin) return;
    setSyncStatus('saving');
    try {
      const isSpirit = mode === 'spirits';
      const table = isSpirit ? 'spirits' : 'wines';
      await sbPatch(table, item.id, { score: newScore });
      
      if (isSpirit) {
        setSpirits(prev => prev.map(s => s.id === item.id ? { ...s, score: newScore } : s));
      } else {
        setWines(prev => prev.map(w => w.id === item.id ? { ...w, score: newScore } : w));
      }
      setSyncStatus('ok');
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
      throw e;
    }
  }

  // Combine and sort history
  // Current navigation state
  const [activeTab, setActiveTab] = useState<'wines' | 'spirits'>(mode);
  
  // Sync tab with mode
  useEffect(() => {
    setActiveTab(mode);
  }, [mode]);

  const historyList = useMemo(() => {
    const list = mode === 'wines' 
      ? consumptions.map(c => ({ ...c, isSpirit: false }))
      : spiritCons.map(c => ({ ...c, isSpirit: true }));
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [consumptions, spiritCons, mode]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#faf7f2] flex flex-col items-center justify-center p-8 text-center z-[10000]">
        <div className="w-16 h-16 border-4 border-[#2c1810]/20 border-t-[#2c1810] rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-medium text-[#2c1810] mb-2 font-serif italic">Adega Pessoal</h2>
        <p className="text-[#5a2e14]/60 text-sm max-w-xs">Carregando sua coleção...</p>
        
        <div className="mt-12 flex flex-col gap-4">
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.href = window.location.pathname; 
            }}
            className="text-xs text-[#5a2e14]/40 hover:text-[#5a2e14] underline flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={12} />
            Forçar Limpeza de Cache & Reset
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onAdminLogin={handleAdminLogin} onGuestLogin={handleGuestLogin} />;
  }

  async function handleExportCSV() {
    try {
      const items = mode === 'wines' ? wines : spirits;
      if (items.length === 0) return alert('Nenhum item para exportar');

      const headers = mode === 'wines' 
        ? ['ID', 'Nome', 'Produtor', 'País', 'Tipo', 'Uva', 'Safra', 'Qtd', 'Nota', 'DrinkFrom', 'DrinkUntil']
        : ['ID', 'Nome', 'Produtor', 'País', 'Tipo', 'Subtipo', 'Volume', 'ABV', 'Nível', 'Qtd', 'Aberta', 'Nota'];

      const rows = items.map(item => {
        if (mode === 'wines') {
          const w = item as Wine;
          return [w.id, w.name, w.producer || '', w.country || '', w.type, w.grape || '', w.vintage || '', w.qty, w.score || '', w.drinkFrom || '', w.drinkUntil || ''];
        } else {
          const s = item as Spirit;
          return [s.id, s.name, s.producer || '', s.country || '', s.type, s.subtype || '', s.volume || '', s.abv || '', s.level, s.qty, s.isOpen ? 'Sim' : 'Não', s.score || ''];
        }
      });

      const csvContent = [headers, ...rows].map(e => e.join(';')).join('\n');
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `adega98_${mode}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('Erro ao exportar CSV');
    }
  }

  async function handleBackup() {
    if (!isAdmin) return;
    setSyncStatus('saving');
    try {
      const [adegasRaw, winesRaw, consRaw, spiritsRaw, sConsRaw] = await Promise.all([
        sbGet('adegas'),
        sbGet('wines'),
        sbGet('consumptions'),
        sbGet('spirits'),
        sbGet('spirit_consumptions')
      ]);

      const data = {
        adegas: adegasRaw,
        wines: winesRaw,
        spirits: spiritsRaw,
        consumptions: consRaw,
        spirit_consumptions: sConsRaw,
        version: '2.0',
        timestamp: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `adega98_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSyncStatus('ok');
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
      alert('Erro ao gerar backup total');
    }
  }

  async function handleRestore(file: File) {
    if (!isAdmin) return;
    if (!confirm('ATENÇÃO: A restauração pode duplicar registros se não for cuidadosa. Os registros existentes com o mesmo ID serão atualizados. Deseja continuar?')) return;
    
    setSyncStatus('saving');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.adegas?.length > 0) await sbUpsert('adegas', data.adegas);
      if (data.wines?.length > 0) await sbUpsert('wines', data.wines);
      if (data.spirits?.length > 0) await sbUpsert('spirits', data.spirits);
      if (data.consumptions?.length > 0) await sbUpsert('consumptions', data.consumptions);
      if (data.spirit_consumptions?.length > 0) await sbUpsert('spirit_consumptions', data.spirit_consumptions);
      if (data.spiritCons?.length > 0) await sbUpsert('spirit_consumptions', data.spiritCons);
      
      await boot();
      setSyncStatus('ok');
      alert('Base de dados restaurada com sucesso!');
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
      alert('Erro na restauração: ' + (e as Error).message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream/30 selection:bg-brand-wine/10 selection:text-brand-wine font-sans antialiased pb-[env(safe-area-inset-bottom)]">
      <Header 
        mode={mode} 
        setMode={setMode} 
        view={view} 
        setView={setView} 
        syncStatus={syncStatus} 
        isAdmin={isAdmin}
        onRefresh={boot}
        onLogout={handleLogout}
        onInout={() => setActiveModal('inout')}
        onReports={() => setActiveModal('reports')}
        onStats={() => setActiveModal('stats')}
        onHistory={() => setView(view === 'cellar' ? 'history' : 'cellar')}
      />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 pt-4 pb-32 md:px-8">
        <AnimatePresence mode="wait">
          {view === 'cellar' ? (
            <motion.div 
              key="cellar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="space-y-2"
            >
              <div className="sticky top-[64px] z-40 -mx-4 px-4 bg-cream/80 backdrop-blur-md py-1 overflow-x-auto no-scrollbar border-b border-black/5">
                <AdegaTabs 
                  adegas={adegas} 
                  activeId={activeAdega} 
                  onChange={setActiveAdega} 
                  mode={mode}
                  wines={wines}
                  spirits={spirits}
                  isAdmin={isAdmin}
                />
              </div>

              {adegas.length === 0 && syncStatus === 'ok' && (
                <div className="p-8 bg-white border border-black/5 rounded-[32px] text-text-muted text-[13px] font-bold flex flex-col items-center gap-4 text-center shadow-sm">
                  <div className="w-14 h-14 bg-cream-dark rounded-full flex items-center justify-center text-2xl">📦</div>
                  <span className="tracking-tight">Sincronizado, mas nenhuma adega foi encontrada.</span>
                </div>
              )}

              <InventoryGrid 
                groupedItems={groupedItems}
                mode={mode}
                adegas={adegas}
                isAdmin={isAdmin}
                groupBy={groupBy}
                onGroupByChange={setGroupBy}
                {...handlers}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2 pt-2">
                <h2 className="font-serif italic text-2xl text-text-main">Histórico de Consumo</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                {historyList.length > 0 ? (
                  historyList.map((cons: any) => {
                    return (
                      <ConsumptionCard 
                        key={cons.id} 
                        consumption={cons} 
                        isSpirit={cons.isSpirit} 
                        isAdmin={isAdmin}
                        onDelete={handleDeleteConsumption}
                      />
                    );
                  })
                ) : (
                  <div className="col-span-full py-32 text-center bg-white rounded-[32px] border border-black/5">
                    <p className="text-brand-wine/10 text-6xl mb-6">🥂</p>
                    <p className="text-text-muted font-bold uppercase tracking-[0.2em] text-[11px]">
                      Nenhum registro encontrado.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* iPhone Premium Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-2xl border-t border-black/5 pb-[env(safe-area-inset-bottom)] px-4 sm:px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-1.5">
          <div className="flex flex-1 justify-around items-center">
            <TabButton 
              active={mode === 'wines' && view === 'cellar'} 
              onClick={() => { setMode('wines'); setView('cellar'); }} 
              icon={<WineIcon size={22} />} 
              label="Vinhos" 
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-2.5 px-2 py-1 bg-black/5 rounded-[28px] border border-white/40 shadow-inner mx-2 sm:mx-4">
            <button 
              onClick={() => setActiveModal('voice')} 
              className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center text-text-main active:scale-90 transition-all hover:bg-white/50 rounded-full"
              title="Voz"
            >
              <Mic size={18} />
            </button>
            
            <button 
              onClick={() => { setSelectedItem(null); setScannedData(null); setActiveModal('edit'); }}
              className="w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center bg-brand-wine text-cream rounded-[18px] sm:rounded-[22px] shadow-xl sm:shadow-2xl shadow-brand-wine/30 active:scale-95 transition-all border border-white/10"
              title="Adicionar"
            >
              <Plus size={22} strokeWidth={2.5} />
            </button>

            <button 
              onClick={() => { setSelectedItem(null); setScannedData(null); setActiveModal('scan'); }}
              className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center text-text-main active:scale-90 transition-all hover:bg-white/50 rounded-full"
              title="Escanear"
            >
              <Camera size={18} />
            </button>
          </div>

          <div className="flex flex-1 justify-around items-center">
            <TabButton 
              active={mode === 'spirits' && view === 'cellar'} 
              onClick={() => { setMode('spirits'); setView('cellar'); }} 
              icon={<GlassWater size={24} />} 
              label="Spirits" 
            />
          </div>
        </div>
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'expert' && selectedItem && (
          <AnalysisModal 
            item={selectedItem} 
            mode={mode} 
            onClose={() => setActiveModal(null)} 
            onSaveNotes={handleSavePersonalNotes}
            onSaveExpertSummary={handleSaveExpertSummary}
            onUpdateScore={handleUpdateScore}
            isAdmin={isAdmin}
          />
        )}
        {activeModal === 'drink' && selectedItem && (
          <DrinkModal 
            item={selectedItem} 
            mode={mode} 
            isAdmin={isAdmin}
            onSave={handleDrinkSave}
            onClose={() => setActiveModal(null)} 
          />
        )}
        {activeModal === 'voice' && (
          <VoiceModal 
            inventory={wines} 
            adegaName={adegas.find(a => a.id === activeAdega)?.name || 'Todas'}
            onSelectItem={(item) => {
              setSelectedItem(item);
              setActiveModal('expert');
            }}
            onClose={() => setActiveModal(null)} 
          />
        )}
        {activeModal === 'edit' && (
          <ItemModal 
            item={selectedItem} 
            mode={mode} 
            adegas={adegas}
            activeAdegaId={activeAdega}
            onSave={async (data) => {
              await handleItemSave(data);
              if (scanQueue.length > 0) {
                const next = scanQueue[0];
                setScanQueue(prev => prev.slice(1));
                setScannedData(next);
              } else {
                setScannedData(null);
                setActiveModal(null);
              }
            }}
            onClose={() => { 
                setActiveModal(null); 
                setScannedData(null); 
                setScanQueue([]);
            }} 
            preScannedData={scannedData}
          />
        )}
        {activeModal === 'scan' && (
          <ImportPhotosModal 
            adegas={adegas}
            activeAdegaId={activeAdega}
            onClose={() => setActiveModal(null)}
            onResults={(results) => {
              if (results.length > 0) {
                const first = results[0];
                setScanQueue(results.slice(1));
                setScannedData(first);
                setSelectedItem(null);
                setActiveModal('edit');
              } else {
                setActiveModal(null);
              }
            }}
          />
        )}
        {activeModal === 'stock' && selectedItem && (
          <StockModal 
            item={selectedItem} 
            mode={mode} 
            allItems={mode === 'wines' ? wines : spirits}
            adegas={adegas}
            isAdmin={isAdmin}
            onClose={() => setActiveModal(null)}
            onRefresh={boot}
          />
        )}
        {activeModal === 'inout' && (
          <ReportsModal 
            onClose={() => setActiveModal(null)}
            onBackup={handleBackup}
            onRestore={handleRestore}
          />
        )}
        {activeModal === 'stats' && (
          <StatsModal 
            onClose={() => setActiveModal(null)}
            wines={wines}
            spirits={spirits}
            consumptions={consumptions}
            spiritCons={spiritCons}
            adegas={adegas}
            context={null} // Global Statistics
          />
        )}
        {activeModal === 'reports' && (
          <StatsModal 
            onClose={() => setActiveModal(null)}
            wines={wines}
            spirits={spirits}
            consumptions={consumptions}
            spiritCons={spiritCons}
            adegas={adegas}
            context={{
                mode,
                view,
                adegaId: activeAdega
            }}
          />
        )}
      </AnimatePresence>

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-[0.03] overflow-hidden">
         <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-wine rounded-full blur-[100px]" />
         <div className="absolute top-1/2 -right-48 w-[500px] h-[500px] bg-brand-gold rounded-full blur-[120px]" />
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-cream-dark">
      <div className="relative">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
          className="w-24 h-24 border-t-[0.5px] border-l-[0.5px] border-brand-wine/20 rounded-full flex items-center justify-center"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="w-16 h-16 bg-brand-wine rounded-[24px] flex items-center justify-center text-3xl shadow-old-lg"
          >
            🍷
          </motion.div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <h2 className="text-text-sub text-[10px] font-bold uppercase tracking-[0.25em] pl-1">Carregando sua adega</h2>
        <div className="flex gap-2.5">
          {[0, 1, 2].map((i) => (
            <motion.div 
              key={i}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.5, 
                delay: i * 0.2,
                ease: "easeInOut"
              }}
              className="w-1 h-1 rounded-full bg-brand-wine"
            />
          ))}
        </div>
      </div>

      {/* Decorative background for loader */}
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-[0.02] overflow-hidden">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-gold rounded-full blur-[150px]" />
      </div>
    </div>
  );
}

function LoginScreen({ onAdminLogin, onGuestLogin }: { onAdminLogin: (token: string) => void; onGuestLogin: () => void }) {
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token } = await sbLogin(email, password);
      onAdminLogin(token);
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream/30 flex flex-col items-center justify-center p-8 font-sans overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center mb-10"
      >
        <h1 className="text-[42px] italic text-text-main mb-1 tracking-tighter font-serif">Adega</h1>
        <div className="text-[10px] text-brand-gold uppercase tracking-[0.3em] font-bold">Coleção Pessoal</div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-black/5 rounded-[32px] p-8 sm:p-10 w-full max-w-sm shadow-old space-y-8"
      >
        {!showAdminForm ? (
          <div className="space-y-4">
             <button 
              onClick={() => setShowAdminForm(true)}
              className="w-full py-4 px-6 bg-brand-wine text-cream rounded-2xl font-serif text-[18px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] relative shadow-lg shadow-brand-wine/10"
            >
              <LogIn size={18} className="absolute left-6" />
              <span>Admin</span>
            </button>

            <div className="flex items-center gap-4 py-2 text-text-muted text-[10px] font-bold uppercase tracking-[2px]">
              <div className="flex-1 h-[1px] bg-black/5" />
              <span>ou</span>
              <div className="flex-1 h-[1px] bg-black/5" />
            </div>

            <button 
              onClick={onGuestLogin}
              className="w-full py-4 px-6 bg-cream-dark/50 border border-black/5 text-text-main rounded-2xl font-serif text-[18px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] relative"
            >
              <User size={18} className="absolute left-6" />
              <span>Convidado</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">E-mail</label>
              <input 
                autoFocus
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-cream-dark/30 border border-black/5 rounded-xl text-[16px] sm:text-sm focus:outline-none focus:border-brand-wine/20 transition-all font-bold"
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-cream-dark/30 border border-black/5 rounded-xl text-[16px] sm:text-sm focus:outline-none focus:border-brand-wine/20 transition-all font-bold"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[11px] rounded-xl font-bold text-center">
                {error}
              </div>
            )}

            <div className="pt-2 space-y-4">
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-brand-wine text-cream rounded-2xl font-serif text-[18px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-brand-wine/20 disabled:opacity-50"
              >
                {loading ? <RefreshCw size={20} className="animate-spin" /> : 'Entrar'}
              </button>
              <button 
                type="button"
                onClick={() => setShowAdminForm(false)}
                className="w-full py-2 text-text-muted text-[10px] font-bold uppercase tracking-widest hover:text-text-main transition-colors"
              >
                ← Voltar
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

function Header({ mode, setMode, view, setView, syncStatus, isAdmin, onRefresh, onLogout, onInout, onReports, onStats, onHistory }: any) {
  return (
    <header className="sticky top-0 z-50 bg-cream/80 backdrop-blur-xl border-b border-black/5 pt-[env(safe-area-inset-top)] mb-[-env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onRefresh}
            className="group flex flex-col"
          >
            <div className="flex items-center gap-2">
              <h1 className="italic text-xl sm:text-2xl text-text-main font-serif tracking-tight">Adega</h1>
              {isAdmin && (
                <span className="text-[7px] bg-brand-wine text-cream px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest leading-none">Admin</span>
              )}
            </div>
            <div className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest transition-all ${syncStatus === 'saving' ? 'text-brand-gold' : syncStatus === 'error' ? 'text-red-700' : 'text-emerald-600'}`}>
              <div className={`w-1 h-1 rounded-full ${syncStatus === 'saving' ? 'animate-pulse bg-brand-gold' : 'bg-current'}`} />
              <span>{syncStatus === 'saving' ? 'Sincronizando…' : 'Online'}</span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onHistory}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${view === 'history' ? 'bg-brand-wine text-white shadow-lg' : 'text-text-muted hover:bg-black/5'}`}
            title={view === 'cellar' ? 'Ver Histórico' : 'Voltar para Adega'}
          >
            {view === 'cellar' ? <History size={18} /> : <LayoutGrid size={18} />}
          </button>

          <button 
            onClick={onStats} 
            className="w-10 h-10 flex items-center justify-center text-text-muted hover:bg-black/5 rounded-full transition-colors"
            title="Estatísticas"
          >
            <BarChart3 size={18} />
          </button>
          
          {isAdmin && (
            <button 
              onClick={onInout} 
              className="w-10 h-10 flex items-center justify-center text-text-muted hover:bg-black/5 rounded-full transition-colors"
              title="Dados brutos"
            >
              <Database size={18} />
            </button>
          )}

          <div className="w-[1px] h-4 bg-black/5 mx-1" />

          <button 
            onClick={onLogout} 
            className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-brand-wine transition-colors"
            title="Sair"
          >
             <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center gap-1.5 transition-all active:scale-95 px-4 ${active ? 'text-brand-wine' : 'text-text-muted opacity-60 hover:opacity-100'}`}
    >
      <div className={`transition-all duration-300 ${active ? 'scale-110' : ''}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-widest text-center ${active ? 'opacity-100' : 'opacity-0 scale-90 translate-y-1'}`}>
        {label}
      </span>
    </button>
  );
}

function HeaderBtn({ icon, label, onClick, className }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-1 p-1 sm:p-1.5 px-1.5 sm:px-2 text-text-sub hover:bg-cream-dark rounded-lg transition-all group flex-shrink-0 ${className}`}
    >
      <span className="text-[14px] flex items-center">{icon}</span>
      <span className="hidden md:inline text-[12px] font-sans">{label}</span>
    </button>
  );
}

function AdegaTabs({ adegas, activeId, onChange, mode, wines, spirits, isAdmin }: any) {
  const order = ['Membeca', 'Rio', 'SP'];
  const sortedAdegas = [...adegas].sort((a, b) => {
    const idxA = order.indexOf(a.name);
    const idxB = order.indexOf(b.name);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  const allAdegas = [...sortedAdegas, { id: 'all', name: 'All', emoji: '' }];

  return (
    <div className="flex flex-nowrap gap-2 pb-1 md:flex-wrap md:gap-3">
      {allAdegas.map((a) => {
        const count = mode === 'wines'
          ? (a.id === 'all' ? wines.reduce((acc: any, w: any) => acc + w.qty, 0) : wines.filter((w: any) => w.adegaId === a.id).reduce((acc: any, w: any) => acc + w.qty, 0))
          : (a.id === 'all' ? spirits.length : spirits.filter((s: any) => s.adegaId === a.id).length);

        const isActive = activeId === a.id;

        return (
          <button
            key={a.id}
            onClick={() => onChange(a.id)}
            className={`flex items-center gap-1.5 rounded-[16px] border transition-all duration-300 whitespace-nowrap font-sans active:scale-[0.96]
              py-1.5 px-3 sm:py-2 sm:px-4
              ${isActive
                ? 'bg-brand-wine text-white border-brand-wine shadow-lg'
                : 'bg-white text-text-sub border-black/8 hover:bg-cream-dark'
              }`}
          >
            {/* Mobile: emoji only (or "All" text for the all-badge) */}
            {a.id === 'all' ? (
              <span className="text-[11px] font-bold sm:hidden">All</span>
            ) : (
              <span className="text-[15px] sm:hidden">{a.emoji}</span>
            )}

            {/* Desktop: emoji + name */}
            <span className="text-sm hidden sm:inline">{a.emoji}</span>
            <span className="text-xs font-bold tracking-tight hidden sm:inline">{a.name}</span>

            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center leading-none
              ${isActive ? 'bg-white/25 text-white' : 'bg-black/6 text-text-muted'}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}


// AdegaTabs ...
