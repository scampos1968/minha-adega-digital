import React, { useState, useEffect, useMemo } from 'react';
import { Wine, Spirit, Adega, Consumption, SpiritConsumption } from './types';
import { sbGet, sbUpsert, sbPatch, sbDel, wineFromDB, spiritFromDB, consumptionFromDB, spiritConsumptionFromDB, consumptionToDB, spiritConsumptionToDB, sbLogin } from './lib/supabase';
import { LogIn, User, Wine as WineIcon, History, RefreshCw, Plus, Mic, Package, Trash2, BookOpen, GlassWater, Settings, X, Search, LogOut, Database, Camera, Star, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryGrid } from './components/InventoryGrid';
import { generateExpertSummaryGemini } from './lib/ai';
import { DrinkModal } from './components/DrinkModal';
import { VoiceModal } from './components/VoiceModal';
import { ConsumptionCard } from './components/ConsumptionCard';
import { StockModal } from './components/StockModal';
import { InOutModal } from './components/InOutModal';
import { ItemModal } from './components/ItemModal';
import { wineToDB, spiritToDB } from './lib/supabase';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<'cellar' | 'history' | 'expert'>('cellar');
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
  const [activeModal, setActiveModal] = useState<'expert' | 'drink' | 'edit' | 'stock' | 'voice' | 'inout' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [scanToken, setScanToken] = useState(0);

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
    onExpert: (item: any) => { setSelectedItem(item); setView('expert'); },
    onInout: () => setActiveModal('inout'),
  };

  const handleExportCSV = () => {
    const rows = [["Nome", "Produtor", "País", "Tipo", "Uva", "Safra", "Qtd", "Adega", "Nota", "Notas"]];
    wines.forEach(w => {
      const a = adegas.find(x => x.id === w.adegaId)?.name || "";
      rows.push([
        w.name,
        w.producer || "",
        w.country || "",
        w.type || "",
        w.grape || "",
        w.vintage || "",
        w.qty.toString(),
        a,
        w.score?.toString() || "",
        (w.notes || "").replace(/\n/g, " ")
      ]);
    });
    const csvContent = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `adega_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        
        // Update spirit level
        await sbPatch('spirits', spirit.id, { level: newLevel, score: data.score });
        
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
        setSpirits(prev => prev.map(s => s.id === spirit.id ? { ...s, level: newLevel, score: data.score } : s));
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
    const list = [
      ...consumptions.map(c => ({ ...c, isSpirit: false })),
      ...spiritCons.map(c => ({ ...c, isSpirit: true }))
    ];
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [consumptions, spiritCons]);

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!isAuthenticated) {
    return <LoginScreen onAdminLogin={handleAdminLogin} onGuestLogin={handleGuestLogin} />;
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
        onVoice={() => setActiveModal('voice')}
        onScan={() => {
          setSelectedItem(null);
          setScanToken(prev => prev + 1);
          setActiveModal('edit');
        }}
        onAdd={() => { setSelectedItem(null); setActiveModal('edit'); }}
        onInout={() => setActiveModal('inout')}
      />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 md:px-8">
        <AnimatePresence mode="wait">
          {view === 'cellar' ? (
            <motion.div 
              key="cellar"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <AdegaTabs 
                adegas={adegas} 
                activeId={activeAdega} 
                onChange={setActiveAdega} 
                mode={mode}
                wines={wines}
                spirits={spirits}
                isAdmin={isAdmin}
              />

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
          ) : view === 'history' ? (
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
          ) : (
            <motion.div
              key="expert"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {selectedItem && (
                <ExpertView 
                  item={selectedItem} 
                  mode={mode} 
                  onClose={() => setView('cellar')} 
                  onUpdateScore={handleUpdateScore}
                  isAdmin={isAdmin}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
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
            onSave={handleItemSave}
            onClose={() => setActiveModal(null)} 
            autoScan={!selectedItem && scanToken > 0}
          />
        )}
        {activeModal === 'stock' && selectedItem && (
          <StockModal 
            item={selectedItem} 
            mode={mode} 
            allItems={mode === 'wines' ? wines : spirits}
            adegas={adegas}
            onClose={() => setActiveModal(null)}
            onRefresh={boot}
          />
        )}
        {activeModal === 'inout' && (
          <InOutModal 
            onClose={() => setActiveModal(null)}
            onExport={handleExportCSV}
            onImport={() => alert('Importação automática via planilha está sendo aprimorada. Use o modo Adicionar por enquanto.')}
            onBackup={() => alert('Backup: Use o Exportar CSV para baixar seus dados em uma planilha.')}
          />
        )}
      </AnimatePresence>

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-[0.05] overflow-hidden">
         <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600 rounded-full blur-[100px]" />
         <div className="absolute top-1/2 -right-48 w-[500px] h-[500px] bg-indigo-400 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
        className="w-20 h-20 border-t-2 border-r-2 border-indigo-200 rounded-full flex items-center justify-center"
      >
        <motion.div 
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg"
        >
          🍷
        </motion.div>
      </motion.div>
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-slate-400 text-xl font-bold uppercase tracking-widest text-xs">Carregando sua adega...</h2>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span 
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
              className="w-1.5 h-1.5 rounded-full bg-indigo-600"
            />
          ))}
        </div>
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

function Header({ mode, setMode, view, setView, syncStatus, isAdmin, onRefresh, onLogout, onVoice, onAdd, onInout, onScan }: any) {
  const isExpertView = view === 'expert';
  
  return (
    <header className="sticky top-0 z-50 bg-cream/94 backdrop-blur-xl border-b border-black/10 h-14.5 flex items-center">
      <div className="max-w-[1300px] mx-auto w-full px-7 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 md:gap-4">
          {isExpertView ? (
            <button 
              onClick={() => setView('cellar')}
              className="flex items-center gap-2 py-2 px-3 bg-cream-dark border border-black/10 rounded-lg text-text-main hover:bg-cream-deep transition-all group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-[13px] font-sans font-medium">Voltar</span>
            </button>
          ) : (
            <>
              <div className="flex bg-transparent items-center gap-1.5">
                <button 
                  onClick={() => setMode('wines')}
                  className={`p-1.5 px-2 rounded-lg transition-all duration-300 text-[18px] leading-none ${mode === 'wines' ? 'bg-brand-wine text-white' : 'text-text-muted opacity-40 hover:opacity-100'}`}
                  title="Vinhos"
                >
                  🍷
                </button>
                <button 
                  onClick={() => setMode('spirits')}
                  className={`p-1.5 px-2 rounded-lg transition-all duration-300 text-[18px] leading-none ${mode === 'spirits' ? 'bg-[#8B4513] text-white' : 'text-text-muted opacity-40 hover:opacity-100'}`}
                  title="Spirits"
                >
                  🥃
                </button>
              </div>
              
              <div className="relative flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <h1 className="italic text-[17px] text-text-main font-serif leading-none">Adega</h1>
                  {isAdmin && (
                    <span className="text-[7px] bg-brand-wine text-white px-1 py-0.5 rounded font-bold uppercase tracking-widest">Admin</span>
                  )}
                </div>
                <div className={`flex items-center gap-1 text-[9px] transition-colors font-sans font-medium ${syncStatus === 'saving' ? 'text-brand-gold' : syncStatus === 'error' ? 'text-red-800' : 'text-emerald-700'}`}>
                  {syncStatus === 'saving' ? <RefreshCw size={9} className="animate-spin" /> : <div className="w-1 h-1 rounded-full bg-current" />}
                  <span className="opacity-80">{syncStatus === 'saving' ? 'Salvando…' : syncStatus === 'error' ? 'Erro' : 'Sincronizado'}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {isExpertView ? (
          <div className="text-center font-serif italic text-text-main text-[16px]">Análise do Especialista</div>
        ) : (
          <nav className="flex items-center gap-0.5 md:gap-1 overflow-hidden">
            <HeaderBtn icon="🔄" label="Refresh" onClick={onRefresh} />
            <HeaderBtn 
              icon={view === 'cellar' ? <History size={16} /> : <WineIcon size={16} />} 
              label={view === 'cellar' ? 'Histórico' : 'Adega'} 
              onClick={() => setView(view === 'cellar' ? 'history' : 'cellar')} 
            />
            
            {isAdmin && (
              <HeaderBtn icon={<Database size={15} />} label="In/Out" onClick={onInout} />
            )}

            <div className="w-[1px] h-4.5 bg-black/10 mx-1 flex-shrink-0" />
            
            <HeaderBtn icon={<Mic size={14} />} label="Voz" onClick={onVoice} />
            <HeaderBtn icon={<Camera size={14} />} label="Scan" onClick={onScan} />
            
            {isAdmin && (
              <button 
                onClick={onAdd}
                className="flex items-center gap-1.5 py-2 px-4 ml-1 bg-brand-wine text-white rounded-lg text-[13px] hover:opacity-85 transition-all active:scale-95"
              >
                <Plus size={14} />
                <span className="hidden sm:inline font-sans">Vinho</span>
              </button>
            )}
            
            <button onClick={onLogout} title="Sair" className="p-2 text-text-sub hover:bg-cream-dark rounded-lg transition-all ml-1 flex-shrink-0">
               <LogOut size={14} />
               <span className="hidden md:inline ml-1 text-[12px]">Sair</span>
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}

function HeaderBtn({ icon, label, onClick, className }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-1 p-1.5 px-2 text-text-sub hover:bg-cream-dark rounded-lg transition-all group flex-shrink-0 ${className}`}
    >
      <span className="text-[14px] flex items-center">{icon}</span>
      <span className="hidden md:inline text-[12px] font-sans">{label}</span>
    </button>
  );
}

function AdegaTabs({ adegas, activeId, onChange, mode, wines, spirits, isAdmin }: any) {
  const allAdegas = [...adegas, { id: 'all', name: 'Todas as adegas', emoji: '🗂️' }];
  
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
      {allAdegas.map((a) => {
        const count = mode === 'wines' 
          ? (a.id === 'all' ? wines.reduce((acc: any, w: any) => acc + w.qty, 0) : wines.filter((w: any) => w.adegaId === a.id).reduce((acc: any, w: any) => acc + w.qty, 0))
          : (a.id === 'all' ? spirits.length : spirits.filter((s: any) => s.adegaId === a.id).length);

        return (
          <button
            key={a.id}
            onClick={() => onChange(a.id)}
            className={`flex items-center gap-2.5 py-2 px-5 rounded-lg border transition-all duration-150 whitespace-nowrap shadow-old font-sans text-[13px] ${
              activeId === a.id 
                ? 'bg-brand-wine text-white border-brand-wine shadow-md' 
                : 'bg-white text-text-sub border-black/5 hover:bg-cream-dark'
            }`}
          >
            <span>{a.emoji}</span>
            <span className="font-normal">{a.name}</span>
            <span className={`text-[11px] px-2 py-0.25 rounded transition-colors ${activeId === a.id ? 'bg-white/20 text-white' : 'bg-cream-dark text-text-sub'}`}>
              {count}
            </span>
          </button>
        );
      })}
      {isAdmin && (
        <button className="flex items-center gap-2 py-2 px-4 rounded-lg border border-dashed border-parchment text-text-muted hover:border-brand-wine hover:text-brand-wine transition-all text-xs font-normal shrink-0 font-sans">
          <Plus size={14} />
          <span>Nova adega</span>
        </button>
      )}
    </div>
  );
}

function ExpertView({ item, mode, onClose, onUpdateScore, isAdmin }: any) {
  const [summary, setSummary] = useState(item.expertSummary || '');
  const [loading, setLoading] = useState(!item.expertSummary);
  const [savingScore, setSavingScore] = useState(false);
  
  const detectedScore = useMemo(() => {
    if (!summary) return null;
    const match = summary.match(/Nota:\s*(\d{2,3})/i);
    return match ? parseInt(match[1]) : null;
  }, [summary]);
  
  useEffect(() => {
    if (!item.expertSummary) {
      handleGenerate();
    }
  }, [item.id]);

  async function handleGenerate() {
    setLoading(true);
    try {
      const text = await generateExpertSummaryGemini(item, mode === 'spirits');
      setSummary(text);
    } catch (e) {
      console.error(e);
      setSummary('Erro ao gerar análise. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveScore() {
    if (!detectedScore || !onUpdateScore) return;
    setSavingScore(true);
    try {
      await onUpdateScore(item, detectedScore);
      alert(`Nota ${detectedScore} aplicada com sucesso!`);
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar nota.');
    } finally {
      setSavingScore(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-cream border border-black/10 rounded-[20px] shadow-old-lg flex flex-col"
      >
        <div className="p-7 flex items-center gap-6 border-b border-black/5 bg-white/30">
           {item.imageUrl ? (
             <img src={item.imageUrl} className="w-[60px] h-[80px] object-cover rounded-lg border border-black/10 shadow-sm shrink-0" />
           ) : (
             <div className="w-[60px] h-[80px] bg-cream-dark rounded-lg flex items-center justify-center text-3xl opacity-40 shrink-0">{mode === 'spirits' ? '🥃' : '🍷'}</div>
           )}
           <div className="flex flex-col justify-center overflow-hidden">
             <div className="flex items-center gap-2">
               <h3 className="text-[24px] font-serif italic text-text-main leading-tight truncate">{item.name}</h3>
               {item.score && (
                 <span className="bg-brand-wine text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{item.score} pts</span>
               )}
             </div>
             <p className="text-[13px] text-brand-gold font-medium mt-1 uppercase tracking-wider">{item.producer} {item.vintage && `· ${item.vintage}`}</p>
             <p className="text-[12px] text-text-muted mt-0.5">{item.type} · {item.country} · {item.region}</p>
           </div>
        </div>

        <div className="p-7 pt-8">
           {loading ? (
             <div className="py-24 flex flex-col items-center gap-5 text-text-muted">
               <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                 <RefreshCw size={40} className="stroke-[1.5px] opacity-30" />
               </motion.div>
               <div className="text-center space-y-1">
                 <p className="font-medium uppercase tracking-[2px] text-[10px]">Sommelier Digital</p>
                 <p className="text-xs opacity-60">Consultando base de dados enológica...</p>
               </div>
             </div>
           ) : (
             <div className="space-y-6">
                <div className="bg-cream-dark border-l-4 border-brand-wine/20 rounded-xl p-7 text-[15px] leading-[1.8] text-text-sub font-sans min-h-[300px] shadow-inner-sm">
                  {summary.split('\n').map((para, i) => para.trim() ? (
                    <p key={i} className={para.startsWith('**') ? 'font-bold text-text-main mt-5 mb-2 first:mt-0 text-[16px]' : 'mb-4 last:mb-0'}>
                        {para.replace(/\*\*/g, '')}
                    </p>
                  ) : null)}
                </div>

                {detectedScore && isAdmin && item.score !== detectedScore && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-brand-gold/5 border border-brand-gold/20 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-gold text-white flex items-center justify-center font-serif italic text-lg shadow-sm">
                        {detectedScore}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[13px] font-bold text-text-main leading-none">Nota Detectada</p>
                        <p className="text-[11px] text-text-sub">Deseja aplicar esta nota ao inventário?</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleSaveScore}
                      disabled={savingScore}
                      className="px-5 py-2.5 bg-brand-gold text-white rounded-lg text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      {savingScore ? <RefreshCw size={12} className="animate-spin" /> : <Star size={12} fill="currentColor" />}
                      Aplicar Nota
                    </button>
                  </motion.div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button 
                    onClick={handleGenerate} 
                    disabled={loading}
                    className="flex-1 py-3 px-6 bg-white border border-parchment rounded-xl text-[11px] font-bold uppercase tracking-widest text-text-main hover:bg-cream-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Regerar Análise
                  </button>
                  <button 
                    onClick={onClose}
                    className="flex-1 py-3 px-6 bg-brand-wine text-[#f0e8d0] rounded-xl text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-md"
                  >
                    Voltar para adega
                  </button>
                </div>
             </div>
           )}
        </div>
      </motion.div>
    </div>
  );
}
