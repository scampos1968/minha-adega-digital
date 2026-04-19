import React, { useState, useEffect, useMemo } from 'react';
import { Wine, Spirit, Adega, Consumption, SpiritConsumption } from './types';
import { sbGet, sbUpsert, sbPatch, wineFromDB, spiritFromDB, consumptionFromDB, spiritConsumptionFromDB, consumptionToDB, spiritConsumptionToDB, sbLogin } from './lib/supabase';
import { LogIn, User, Wine as WineIcon, History, RefreshCw, Plus, Mic, Package, Trash2, BookOpen, GlassWater, Settings, X, Search, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryGrid } from './components/InventoryGrid';
import { generateExpertSummaryGemini } from './lib/ai';
import { DrinkModal } from './components/DrinkModal';
import { VoiceModal } from './components/VoiceModal';
import { ConsumptionCard } from './components/ConsumptionCard';
import { ItemModal } from './components/ItemModal';
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
  
  // Modal state
  const [activeModal, setActiveModal] = useState<'expert' | 'drink' | 'edit' | 'stock' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    checkSession();
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
  };

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
    <div className="min-h-screen flex flex-col selection:bg-wine/10 selection:text-wine font-sans antialiased">
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
        onAdd={() => { setSelectedItem(null); setActiveModal('edit'); }}
      />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 md:px-8">
        <AnimatePresence mode="wait">
          {view === 'cellar' ? (
            <motion.div 
              key="cellar"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <div className="space-y-1">
                <h2 className="text-3xl font-serif italic text-text-main">
                  {mode === 'wines' ? 'Coleção de Vinhos' : 'Destilados & Spirits'}
                </h2>
                <p className="text-sm text-text-sub">Gerencie seu inventário e janelas de consumo.</p>
              </div>

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
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs italic flex items-center gap-2">
                  <Package size={14} />
                  <span>Sincronizado, mas nenhuma adega foi encontrada no banco de dados.</span>
                </div>
              )}

              <div className="bg-parchment/10 h-[1px] w-full" />

              <InventoryGrid 
                items={itemsToShow} 
                mode={mode} 
                adegas={adegas} 
                isAdmin={isAdmin} 
                {...handlers}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <div className="space-y-1">
                <h2 className="text-3xl font-serif italic text-text-main">Histórico de Degustações</h2>
                <p className="text-sm text-text-sub">As memórias líquidas da sua adega.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                {historyList.length > 0 ? (
                  historyList.map((cons: any) => {
                    return <ConsumptionCard key={cons.id} consumption={cons} isSpirit={cons.isSpirit} />;
                  })
                ) : (
                  <div className="col-span-full py-20 text-center text-text-muted italic">
                    Nenhum registro de consumo encontrado.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'expert' && selectedItem && (
          <ExpertModal 
            item={selectedItem} 
            mode={mode} 
            onClose={() => setActiveModal(null)} 
          />
        )}
        {activeModal === 'drink' && selectedItem && (
          <DrinkModal 
            item={selectedItem} 
            mode={mode} 
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
              setActiveModal('expert'); // Open expert summary for the selected item
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-cream">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
        className="w-20 h-20 border-t-2 border-r-2 border-wine/20 rounded-full flex items-center justify-center"
      >
        <motion.div 
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-12 h-12 bg-wine rounded-2xl flex items-center justify-center text-white text-2xl shadow-sh2"
        >
          🍷
        </motion.div>
      </motion.div>
      <div className="flex flex-col items-center gap-2">
        <h2 className="italic text-text-muted text-xl font-serif">Carregando sua adega...</h2>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span 
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
              className="w-1.5 h-1.5 rounded-full bg-wine"
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 font-sans overflow-hidden relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10 relative z-10"
      >
        <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
          <WineIcon className="text-indigo-600" size={32} />
        </div>
        <h1 className="text-4xl font-serif italic text-slate-900 mb-2 tracking-tight">Adega</h1>
        <div className="text-[10px] text-slate-400 uppercase tracking-[4px] font-bold">Reserva Particular</div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-slate-200 rounded-[32px] p-8 w-full max-w-sm shadow-xl space-y-6 relative z-10"
      >
        {!showAdminForm ? (
          <div className="space-y-4">
            <button 
              onClick={() => setShowAdminForm(true)}
              className="w-full py-4 px-6 bg-slate-900 text-white rounded-2xl font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
            >
              <LogIn size={18} />
              <span>Acesso Admin</span>
            </button>

            <div className="flex items-center gap-4 py-2 text-slate-300 text-[10px] font-bold uppercase tracking-[2px]">
              <div className="flex-1 h-[1px] bg-slate-100" />
              <span>ou</span>
              <div className="flex-1 h-[1px] bg-slate-100" />
            </div>

            <button 
              onClick={onGuestLogin}
              className="w-full py-4 px-6 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm active:scale-[0.98]"
            >
              <User size={18} className="text-indigo-600" />
              <span>Acesso Visitante</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">E-mail</label>
              <input 
                autoFocus
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl italic"
              >
                {error}
              </motion.div>
            )}

            <div className="pt-2 space-y-3">
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-indigo-600 text-white rounded-2xl font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? <RefreshCw size={18} className="animate-spin" /> : <LogIn size={18} />}
                <span>Entrar</span>
              </button>
              <button 
                type="button"
                onClick={() => setShowAdminForm(false)}
                className="w-full py-3 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Voltar
              </button>
            </div>
          </form>
        )}
      </motion.div>
      
      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[100px] -z-10" />
    </div>
  );
}

function Header({ mode, setMode, view, setView, syncStatus, isAdmin, onRefresh, onLogout, onVoice, onAdd }: any) {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 h-16 flex items-center shadow-sm">
      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex bg-slate-100 p-1 rounded-[14px] border border-slate-200 shadow-inner">
            <button 
              onClick={() => setMode('wines')}
              className={`p-2 rounded-xl transition-all duration-300 ${mode === 'wines' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
              title="Vinhos"
            >
              <WineIcon size={18} />
            </button>
            <button 
              onClick={() => setMode('spirits')}
              className={`p-2 rounded-xl transition-all duration-300 ${mode === 'spirits' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
              title="Spirits"
            >
              <GlassWater size={18} />
            </button>
          </div>
          
          <div className="relative pt-1">
            <div className="flex items-center gap-2">
              <h1 className="font-serif italic text-xl tracking-tight text-slate-800 leading-none">Adega</h1>
              {isAdmin && (
                <span className="text-[8px] bg-slate-900 text-white px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest">Admin</span>
              )}
            </div>
            <div className={`mt-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors ${syncStatus === 'saving' ? 'text-indigo-600' : syncStatus === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
              {syncStatus === 'saving' ? <RefreshCw size={10} className="animate-spin" /> : <div className="w-1 h-1 rounded-full bg-current shadow-[0_0_4px_currentColor]" />}
              <span className="opacity-80">{syncStatus === 'saving' ? 'Salvando' : syncStatus === 'error' ? 'Erro' : 'Sincronizado'}</span>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1.5 md:gap-3">
          <HeaderBtn icon={<RefreshCw size={16} />} label="Refresh" onClick={onRefresh} />
          <HeaderBtn 
            icon={view === 'cellar' ? <History size={16} /> : <WineIcon size={16} />} 
            label={view === 'cellar' ? 'Histórico' : 'Adega'} 
            onClick={() => setView(view === 'cellar' ? 'history' : 'cellar')} 
          />
          <div className="w-[1px] h-4 bg-slate-200 mx-1 md:mx-2" />
          <HeaderBtn icon={<Mic size={16} />} label="Voz" onClick={onVoice} className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100" />
          
          {isAdmin && (
            <button 
              onClick={onAdd}
              className="flex items-center gap-2 py-2 px-3 sm:px-5 bg-indigo-600 text-white rounded-[14px] text-xs font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-md active:scale-95"
            >
              <Plus size={16} />
              <span className="hidden xs:inline sm:inline">Adicionar</span>
            </button>
          )}
          
          <button onClick={onLogout} title="Sair" className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <LogOut size={18} />
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
      className={`flex items-center gap-2.5 p-2.5 px-3 text-slate-500 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group ${className}`}
    >
      <span className="group-hover:text-indigo-600 transition-colors">{icon}</span>
      <span className="hidden md:inline text-[10px] font-bold tracking-tight uppercase">{label}</span>
    </button>
  );
}

function AdegaTabs({ adegas, activeId, onChange, mode, wines, spirits, isAdmin }: any) {
  const allAdegas = [...adegas, { id: 'all', name: 'Todas as adegas', emoji: '🗂️' }];
  
  return (
    <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
      {allAdegas.map((a) => {
        const count = mode === 'wines' 
          ? (a.id === 'all' ? wines.reduce((acc: any, w: any) => acc + w.qty, 0) : wines.filter((w: any) => w.adegaId === a.id).reduce((acc: any, w: any) => acc + w.qty, 0))
          : (a.id === 'all' ? spirits.length : spirits.filter((s: any) => s.adegaId === a.id).length);

        return (
          <button
            key={a.id}
            onClick={() => onChange(a.id)}
            className={`flex items-center gap-3 py-2.5 px-5 rounded-2xl border transition-all duration-300 whitespace-nowrap group ${
              activeId === a.id 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg ring-4 ring-indigo-500/10' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <span className="text-lg group-hover:scale-110 transition-transform">{a.emoji}</span>
            <span className="text-sm font-bold tracking-tight">{a.name}</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${activeId === a.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
              {count}
            </span>
          </button>
        );
      })}
      {isAdmin && (
        <button className="flex items-center gap-3 py-2.5 px-5 rounded-2xl border border-dashed border-slate-300 text-slate-400 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all text-sm font-bold italic shrink-0">
          <Plus size={14} />
          <span>Nova</span>
        </button>
      )}
    </div>
  );
}

function ExpertModal({ item, mode, onClose }: any) {
  const [summary, setSummary] = useState(item.expertSummary || '');
  const [loading, setLoading] = useState(!item.expertSummary);
  
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-text-main/40 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-cream border border-parchment/20 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="p-6 md:p-8 flex items-start justify-between border-b border-parchment/10 bg-white/50">
           <div className="flex gap-4">
             {item.imageUrl ? (
               <div className="relative group">
                 <img src={item.imageUrl} className="w-16 h-20 object-cover rounded-xl border border-parchment/20 shadow-sm" />
                 <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-xl" />
               </div>
             ) : (
               <div className="w-16 h-20 bg-cream2 rounded-xl flex items-center justify-center text-3xl opacity-40">🍷</div>
             )}
             <div className="space-y-1">
               <h3 className="text-2xl font-serif italic text-text-main leading-tight">{item.name}</h3>
               <p className="text-sm text-text-muted font-medium">{item.producer} · {item.vintage || item.type}</p>
             </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-cream2 rounded-full transition-colors text-text-sub">
             <X size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
           {loading ? (
             <div className="py-20 flex flex-col items-center gap-4 text-text-muted">
               <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                 <RefreshCw size={32} className="opacity-40" />
               </motion.div>
               <p className="italic font-serif">Consultando sommelier digital...</p>
             </div>
           ) : (
             <div className="prose prose-stone prose-sm max-w-none text-text-main/80 leading-relaxed font-sans">
               {summary.split('\n').map((para, i) => para.trim() ? (
                 <p key={i} className={para.startsWith('**') ? 'font-bold text-text-main mt-4 text-base' : 'mt-2'}>
                    {para.replace(/\*\*/g, '')}
                 </p>
               ) : null)}
             </div>
           )}
        </div>

        <div className="p-6 border-t border-parchment/10 bg-white/50 flex justify-between gap-3">
          <button 
            onClick={handleGenerate} 
            disabled={loading}
            className="flex-1 py-3 px-6 bg-white border border-parchment/60 rounded-xl text-xs font-bold uppercase tracking-widest text-gold hover:bg-cream2 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Gerar Nova Análise
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-6 bg-wine text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-md"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
