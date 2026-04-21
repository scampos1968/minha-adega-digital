import React, { useState, useEffect, useMemo } from 'react';
import { Wine, Spirit, Adega, Consumption, SpiritConsumption } from './types';
import { sbGet, sbUpsert, sbPatch, sbDel, wineFromDB, spiritFromDB, consumptionFromDB, spiritConsumptionFromDB, consumptionToDB, spiritConsumptionToDB, sbLogin } from './lib/supabase';
import { LogIn, User, Wine as WineIcon, History, RefreshCw, Plus, Mic, Package, Trash2, BookOpen, GlassWater, Settings, X, Search, LogOut, Database, Camera, Star, ArrowLeft, LayoutGrid, BarChart3, ChevronRight, ChevronDown } from 'lucide-react';
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
import { wineToDB, spiritToDB } from './lib/supabase';

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
    checkSession();
    
    // Auth error handling (JWT expired)
    const handleAuthError = () => {
      handleLogout();
      alert('Sua sessão expirou. Por favor, faça login novamente.');
    };
    window.addEventListener('adega-auth-error', handleAuthError);
    return () => window.removeEventListener('adega-auth-error', handleAuthError);
  }, []);

  async function checkSession() {
    const sessionString = localStorage.getItem('adega_session');
    if (sessionString) {
      const session = JSON.parse(sessionString);
      setIsAuthenticated(true);
      setIsAdmin(!!session.isAdmin);
      await boot();
    } else {
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
    ? (activeAdega === 'all' ? wines : wines.filter(w => w.adegaId === activeAdega))
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
  const historyList = useMemo(() => {
    const list = mode === 'wines' 
      ? consumptions.map(c => ({ ...c, isSpirit: false }))
      : spiritCons.map(c => ({ ...c, isSpirit: true }));
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [consumptions, spiritCons, mode]);

  if (loading) {
    return <LoadingIndicator />;
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
    <div className="min-h-screen flex flex-col selection:bg-indigo-100 selection:text-indigo-600 font-sans antialiased">
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
      />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 pt-1 pb-24 md:px-8">
        <AnimatePresence mode="wait">
          {view === 'cellar' ? (
            <motion.div 
              key="cellar"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-1"
            >
              <div className="overflow-x-auto -mx-4 px-4 no-scrollbar pb-2">
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
                <div className="p-4 bg-cream-dark border border-parchment rounded-xl text-text-sub text-xs font-medium flex items-center gap-2">
                  <Package size={14} />
                  <span>Sincronizado, mas nenhuma adega foi encontrada.</span>
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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4"
            >
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
                  <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    Nenhum registro de consumo encontrado.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Bar for iPhone Optimization */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-black/5 px-6 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex items-center justify-between z-40 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <button 
          onClick={() => setView('cellar')} 
          className={`flex flex-col items-center gap-1 transition-all ${view === 'cellar' ? 'text-brand-wine' : 'text-text-muted'}`}
        >
          <LayoutGrid size={20} strokeWidth={view === 'cellar' ? 2.5 : 2} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Adega</span>
        </button>

        <button 
          onClick={() => setActiveModal('stats')} 
          className={`flex flex-col items-center gap-1 transition-all ${activeModal === 'stats' ? 'text-brand-wine' : 'text-text-muted'}`}
        >
          <BarChart3 size={20} strokeWidth={activeModal === 'stats' ? 2.5 : 2} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Estatística</span>
        </button>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveModal('voice')} 
            className="w-11 h-11 flex items-center justify-center bg-cream-dark text-text-main rounded-2xl active:scale-90 transition-all border border-black/5"
          >
            <Mic size={20} />
          </button>
          
          {isAdmin && (
            <button 
              onClick={() => { setSelectedItem(null); setScannedData(null); setActiveModal('edit'); }}
              className="w-12 h-12 flex items-center justify-center bg-brand-wine text-white rounded-2xl shadow-lg shadow-brand-wine/20 active:scale-90 transition-all border border-brand-wine/20"
            >
              <Plus size={24} strokeWidth={2.5} />
            </button>
          )}

          <button 
            onClick={() => { setSelectedItem(null); setScannedData(null); setActiveModal('scan'); }}
            className="w-11 h-11 flex items-center justify-center bg-cream-dark text-text-main rounded-2xl active:scale-90 transition-all border border-black/5"
          >
            <Camera size={20} />
          </button>
        </div>

        <button 
          onClick={() => setView('history')} 
          className={`flex flex-col items-center gap-1 transition-all ${view === 'history' ? 'text-brand-wine' : 'text-text-muted'}`}
        >
          <History size={20} strokeWidth={view === 'history' ? 2.5 : 2} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Histórico</span>
        </button>
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
    <div className="min-h-screen bg-cream-dark flex flex-col items-center justify-center p-8 font-sans overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-[36px] italic text-[#2c1810] mb-1 tracking-tight font-serif">Adega</h1>
        <div className="text-[11px] text-[#8a6040] uppercase tracking-[3px] font-bold">Coleção Pessoal</div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-cream border border-parchment/50 rounded-[20px] p-10 w-full max-w-sm shadow-old space-y-8"
      >
        {!showAdminForm ? (
          <div className="space-y-4">
             <button 
              onClick={() => setShowAdminForm(true)}
              className="w-full py-4 px-6 bg-[#5a2e14] text-[#f0e8d0] rounded-xl font-serif text-[17px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] relative"
            >
              <LogIn size={16} className="absolute left-6" />
              <span>Admin</span>
            </button>

            <div className="flex items-center gap-4 py-2 text-text-muted text-[11px] font-bold uppercase tracking-[2px]">
              <div className="flex-1 h-[0.5px] bg-parchment" />
              <span>ou</span>
              <div className="flex-1 h-[0.5px] bg-parchment" />
            </div>

            <button 
              onClick={onGuestLogin}
              className="w-full py-4 px-6 bg-white border border-parchment text-text-main rounded-xl font-serif text-[17px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] relative"
            >
              <User size={16} className="absolute left-6" />
              <span>Guest</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#8a6040] uppercase tracking-wider ml-1">E-mail</label>
              <input 
                autoFocus
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-parchment rounded-lg text-sm focus:outline-none focus:border-brand-wine transition-all"
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#8a6040] uppercase tracking-wider ml-1">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-parchment rounded-lg text-sm focus:outline-none focus:border-brand-wine transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg font-bold text-center">
                {error}
              </div>
            )}

            <div className="pt-2 space-y-3">
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 bg-brand-wine text-[#f0e8d0] rounded-xl font-serif text-[16px] flex items-center justify-center gap-3 transition-all disabled:opacity-50"
              >
                {loading ? <RefreshCw size={18} className="animate-spin" /> : 'Entrar'}
              </button>
              <button 
                type="button"
                onClick={() => setShowAdminForm(false)}
                className="w-full py-3 text-text-sub text-[11px] font-bold uppercase tracking-widest hover:text-text-main transition-colors"
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

function Header({ mode, setMode, view, setView, syncStatus, isAdmin, onRefresh, onLogout, onInout, onReports }: any) {
  return (
    <header className="sticky top-0 z-50 bg-cream/96 backdrop-blur-md border-b border-black/5 h-auto py-2 flex items-center">
      <div className="max-w-[1300px] mx-auto w-full px-4 flex flex-wrap items-center justify-between gap-y-2">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-0.5 bg-cream-dark p-1 rounded-lg">
            <button 
              onClick={() => setMode('wines')}
              className={`w-8 h-7 rounded-md transition-all text-base flex items-center justify-center ${mode === 'wines' ? 'bg-brand-wine text-white shadow-sm' : 'text-text-muted opacity-40 hover:opacity-100'}`}
            >
              🍷
            </button>
            <button 
              onClick={() => setMode('spirits')}
              className={`w-8 h-7 rounded-md transition-all text-base flex items-center justify-center ${mode === 'spirits' ? 'bg-[#8B4513] text-white shadow-sm' : 'text-text-muted opacity-40 hover:opacity-100'}`}
            >
              🥃
            </button>
          </div>
          
          <div className="flex flex-col relative">
            <button 
              onClick={onRefresh}
              className="flex items-center gap-1.5 focus:outline-none group relative pl-0.5"
            >
              <div className="absolute -left-1.5 -top-1 w-10 h-10 flex items-center justify-center pointer-events-none">
                <RefreshCw 
                  size={28} 
                  className={`text-brand-wine transition-all ${syncStatus === 'saving' ? 'animate-spin opacity-30' : 'opacity-0'}`} 
                />
              </div>
              <h1 className="italic text-[17px] sm:text-[19px] text-text-main font-serif leading-none tracking-tight relative z-10">Adega</h1>
              {isAdmin && (
                <span className="text-[7px] bg-[#2c1810] text-[#f0e8d0] px-1 py-0.5 rounded font-bold uppercase tracking-widest leading-none hidden xs:inline-block relative z-10">Admin</span>
              )}
            </button>
            <div className={`flex items-center gap-1 text-[9px] font-medium font-sans mt-0.5 ${syncStatus === 'saving' ? 'text-brand-gold' : syncStatus === 'error' ? 'text-red-800' : 'text-emerald-600'}`}>
              <div className={`w-1 h-1 rounded-full ${syncStatus === 'saving' ? 'animate-pulse bg-brand-gold' : 'bg-current'}`} />
              <span className="opacity-70">{syncStatus === 'saving' ? 'Sync…' : 'Sync'}</span>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          <button onClick={onReports} className="p-1.5 sm:p-2 text-text-sub hover:bg-black/5 rounded-full transition-colors" title="Relatório de Análise">
            <BarChart3 size={16} />
          </button>
          
          {isAdmin && (
            <button onClick={onInout} className="p-1.5 sm:p-2 text-text-sub hover:bg-black/5 rounded-full transition-colors" title="Gestão da Base de Dados">
              <Database size={16} />
            </button>
          )}

          <button onClick={onLogout} className="p-1.5 sm:p-2 text-text-sub hover:bg-black/5 rounded-full transition-colors" title="Sair">
             <LogOut size={16} />
          </button>
        </nav>
      </div>
    </header>
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
  // Sort adegas by specific order: Membeca, Rio, SP
  const order = ['Membeca', 'Rio', 'SP'];
  const sortedAdegas = [...adegas].sort((a, b) => {
    const idxA = order.indexOf(a.name);
    const idxB = order.indexOf(b.name);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  const allAdegas = [...sortedAdegas, { id: 'all', name: 'Todas', emoji: '🏢' }];
  
  return (
    <div className="flex flex-nowrap gap-2 pb-1 md:flex-wrap md:gap-4 md:mx-0 md:px-0">
      {allAdegas.map((a) => {
        const count = mode === 'wines' 
          ? (a.id === 'all' ? wines.reduce((acc: any, w: any) => acc + w.qty, 0) : wines.filter((w: any) => w.adegaId === a.id).reduce((acc: any, w: any) => acc + w.qty, 0))
          : (a.id === 'all' ? spirits.length : spirits.filter((s: any) => s.adegaId === a.id).length);

        return (
          <button
            key={a.id}
            onClick={() => onChange(a.id)}
            className={`flex items-center gap-2.5 py-1 px-3 sm:px-4 rounded-[12px] border transition-all duration-200 whitespace-nowrap shadow-sm font-sans text-[13px] sm:text-[14px] ${
              activeId === a.id 
                ? 'bg-brand-wine text-white border-brand-wine shadow-md ring-2 ring-brand-wine/10' 
                : 'bg-white text-text-sub border-black/5 hover:border-black/10'
            }`}
          >
            <span className="text-[14px] sm:text-[16px]">{a.emoji}</span>
            <span className="font-semibold">{a.name}</span>
            <span className={`text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md transition-colors ml-1 ${activeId === a.id ? 'bg-white/20 text-white' : 'bg-cream-dark text-text-muted'}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}


// AdegaTabs ...
