import { useState, useMemo } from 'react';
import { Wine, Spirit, Adega, Consumption, SpiritConsumption } from '../types';
import { WineCard } from './WineCard';
import { SpiritCard } from './SpiritCard';
import { Search, Filter, X, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GridProps {
  items: (Wine | Spirit)[];
  mode: 'wines' | 'spirits';
  adegas: Adega[];
  isAdmin: boolean;
  onDrink: (item: any) => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onStock: (item: any) => void;
  onExpert: (item: any) => void;
}

export function InventoryGrid({ items, mode, adegas, isAdmin, ...handlers }: GridProps) {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    country: '',
    vintage: '',
  });

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.producer?.toLowerCase().includes(search.toLowerCase());
      
      const matchType = !filters.type || item.type === filters.type;
      const matchCountry = !filters.country || item.country === filters.country;
      const matchVintage = !filters.vintage || (item as Wine).vintage === filters.vintage;

      return matchSearch && matchType && matchCountry && matchVintage;
    }).sort((a, b) => {
      // Sort: Available first, then consumed
      const isEmptyA = (a as Wine).qty === 0 || (a as Spirit).level === 0;
      const isEmptyB = (b as Wine).qty === 0 || (b as Spirit).level === 0;
      if (isEmptyA && !isEmptyB) return 1;
      if (!isEmptyA && isEmptyB) return -1;
      return a.name.localeCompare(b.name);
    });
  }, [items, search, filters]);

  const uniqueCountries = useMemo(() => [...new Set(items.map(i => i.country).filter(Boolean))].sort(), [items]);
  const uniqueTypes = useMemo(() => [...new Set(items.map(i => i.type))].sort(), [items]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" size={16} />
          <input 
            type="text"
            placeholder={`Buscar por nome ou produtor...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub hover:text-wine">
              <X size={14} />
            </button>
          )}
        </div>
        
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-semibold tracking-tight ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <Filter size={16} />
          <span>Filtros</span>
          {(filters.type || filters.country || filters.vintage) && (
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          )}
        </button>
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 ml-1">Tipo</label>
                <select 
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Todos os tipos</option>
                  {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 ml-1">País</label>
                <select 
                  value={filters.country}
                  onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Todos os países</option>
                  {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {(filters.type || filters.country || filters.vintage) && (
                <div className="col-span-full pt-2 flex justify-end font-sans">
                  <button 
                    onClick={() => setFilters({ type: '', country: '', vintage: '' })}
                    className="text-[10px] font-bold text-wine uppercase tracking-tight hover:underline flex items-center gap-1"
                  >
                    <X size={10} /> Limpar Filtros
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        <AnimatePresence mode="popLayout">
          {filteredItems.map(item => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {mode === 'wines' ? (
                <WineCard 
                  wine={item as Wine} 
                  adega={adegas.find(a => a.id === item.adegaId)}
                  isAdmin={isAdmin}
                  {...handlers}
                />
              ) : (
                <SpiritCard 
                  spirit={item as Spirit}
                  adega={adegas.find(a => a.id === item.adegaId)}
                  isAdmin={isAdmin}
                  {...handlers}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-32 space-y-4">
          <div className="text-5xl opacity-20">🍷</div>
          <div className="space-y-1">
            <h3 className="font-serif italic text-text-muted text-xl">Nenhum item encontrado</h3>
            <p className="text-sm text-text-sub">Tente ajustar seus filtros ou busca.</p>
          </div>
        </div>
      )}
    </div>
  );
}
