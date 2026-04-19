import { useState, useMemo } from 'react';
import { Wine, Spirit, Adega, Consumption, SpiritConsumption } from '../types';
import { WineCard } from './WineCard';
import { SpiritCard } from './SpiritCard';
import { Search, Filter, X, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GridProps {
  groupedItems: Record<string, (Wine | Spirit)[]>;
  mode: 'wines' | 'spirits';
  adegas: Adega[];
  isAdmin: boolean;
  groupBy: string;
  onGroupByChange: (val: string) => void;
  onDrink: (item: any) => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onStock: (item: any) => void;
  onExpert: (item: any) => void;
}

export function InventoryGrid({ groupedItems, mode, adegas, isAdmin, groupBy, onGroupByChange, ...handlers }: GridProps) {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [filters, setFilters] = useState({
    type: '',
    country: '',
    vintage: '',
    readyOnly: false,
  });
  
  const allItems = Object.values(groupedItems).flat();
  
  const filteredGroupedItems = useMemo(() => {
    const next: Record<string, any[]> = {};
    Object.entries(groupedItems).forEach(([group, items]) => {
      const filtered = items.filter(item => {
        const matchSearch = 
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.producer?.toLowerCase().includes(search.toLowerCase()) ||
          item.notes?.toLowerCase().includes(search.toLowerCase());
        
        const matchType = !filters.type || item.type === filters.type;
        const matchCountry = !filters.country || item.country === filters.country;
        const matchVintage = !filters.vintage || (item as Wine).vintage === filters.vintage;
        
        const isReady = (item as Wine).drinkFrom && (item as Wine).drinkUntil && 
                        new Date().getFullYear() >= (item as Wine).drinkFrom! && 
                        new Date().getFullYear() <= (item as Wine).drinkUntil!;
        const matchReady = !filters.readyOnly || isReady;

        return matchSearch && matchType && matchCountry && matchVintage && matchReady;
      }).sort((a, b) => {
        const isEmptyA = (a as Wine).qty === 0 || (a as Spirit).level === 0;
        const isEmptyB = (b as Wine).qty === 0 || (b as Spirit).level === 0;
        if (isEmptyA && !isEmptyB) return 1;
        if (!isEmptyA && isEmptyB) return -1;
        
        if (sortBy === 'vintage') {
          return (Number((b as Wine).vintage) || 0) - (Number((a as Wine).vintage) || 0);
        }
        if (sortBy === 'score') {
          return (b.score || 0) - (a.score || 0);
        }
        return a.name.localeCompare(b.name);
      });
      if (filtered.length > 0) next[group] = filtered;
    });
    return next;
  }, [groupedItems, search, filters, sortBy]);

  const uniqueCountries = useMemo(() => [...new Set(allItems.map(i => i.country).filter(Boolean))].sort(), [allItems]);
  const uniqueTypes = useMemo(() => [...new Set(allItems.map(i => i.type))].sort(), [allItems]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-2.5 items-center bg-white border border-black/10 rounded-[14px] p-4 mb-6 shadow-old">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
          <input 
            type="text"
            placeholder={`Buscar na adega...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-cream-dark border border-black/5 rounded-lg py-2 pl-9 pr-9 text-[13px] outline-none focus:border-brand-wine/30 transition-all font-light"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand-wine p-1">
              <X size={13} />
            </button>
          )}
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cream-dark border border-black/5 rounded-lg flex-1 md:flex-none">
             <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Agrupar</span>
             <select 
              value={groupBy}
              onChange={e => onGroupByChange(e.target.value)}
              className="text-[12px] font-normal outline-none bg-transparent text-text-main cursor-pointer"
             >
                <option value="none">—</option>
                <option value="country">País</option>
                <option value="type">Tipo</option>
                <option value="grape">Uva</option>
                <option value="vintage">Safra</option>
                <option value="adegaId">Adega</option>
             </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-cream-dark border border-black/5 rounded-lg flex-1 md:flex-none">
             <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Ordem</span>
             <select 
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-[12px] font-normal outline-none bg-transparent text-text-main cursor-pointer"
             >
                <option value="name">Nome (A-Z)</option>
                <option value="vintage">Safra (Mais novo)</option>
                <option value="score">Pontuação</option>
             </select>
          </div>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${
              showFilters 
                ? 'bg-brand-wine text-white border-brand-wine shadow-sm' 
                : 'bg-white border-black/10 text-text-sub hover:bg-cream-dark shadow-sm'
            }`}
            title="Filtrar adega"
          >
            <Filter size={18} />
          </button>
        </div>
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-cream border border-black/10 rounded-[14px] shadow-old mb-4">
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest font-bold text-text-muted ml-0.5">Tipo</label>
                <select 
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full bg-cream-dark border border-black/5 rounded-lg py-2 px-3 text-[13px] outline-none focus:border-brand-wine/30"
                >
                  <option value="">Todos os tipos</option>
                  {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest font-bold text-text-muted ml-0.5">País</label>
                <select 
                  value={filters.country}
                  onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                  className="w-full bg-cream-dark border border-black/5 rounded-lg py-2 px-3 text-[13px] outline-none focus:border-brand-wine/30"
                >
                  <option value="">Todos os países</option>
                  {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest font-bold text-text-muted ml-0.5">Safra</label>
                <select 
                  value={filters.vintage}
                  onChange={(e) => setFilters({ ...filters, vintage: e.target.value })}
                  className="w-full bg-cream-dark border border-black/5 rounded-lg py-2 px-3 text-[13px] outline-none focus:border-brand-wine/30"
                >
                  <option value="">Todas as safras</option>
                  {[...new Set(allItems.map(i => (i as Wine).vintage).filter(Boolean))].sort().reverse().map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ ...filters, readyOnly: !filters.readyOnly })}
                  className={`w-full py-2 rounded-lg border transition-all text-[11px] font-bold uppercase tracking-widest ${filters.readyOnly ? 'bg-brand-wine border-brand-wine text-white shadow-sm' : 'bg-cream-dark border-black/5 text-text-sub hover:bg-cream-deep'}`}
                >
                  🎯 NO PONTO
                </button>
              </div>

              {(filters.type || filters.country || filters.vintage || filters.readyOnly) && (
                <div className="col-span-full pt-2 flex justify-end font-sans">
                  <button 
                    onClick={() => setFilters({ type: '', country: '', vintage: '', readyOnly: false })}
                    className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight hover:underline flex items-center gap-1"
                  >
                    <X size={10} /> Limpar Filtros
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-12">
        {Object.entries(filteredGroupedItems).map(([group, sectionItems]: [string, any[]]) => (
          <div key={group || 'all'} className="space-y-4">
            {groupBy !== 'none' && (
              <div className="flex items-center gap-3">
                <span className="bg-brand-wine/10 text-brand-wine text-[12px] font-medium px-4 py-1.5 rounded-lg font-serif italic">
                  {groupBy === 'adegaId' ? adegas.find(a => a.id === group)?.name || group : group}
                </span>
                <div className="flex-1 h-[1px] bg-black/5" />
                <span className="text-[11px] font-normal text-text-muted">
                  {sectionItems.length} garrafas
                </span>
              </div>
            )}
            
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              <AnimatePresence mode="popLayout">
                {sectionItems.map(item => (
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
          </div>
        ))}
      </div>

      {Object.keys(filteredGroupedItems).length === 0 && (
        <div className="text-center py-32 space-y-4">
          <div className="text-5xl opacity-20">🍷</div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-xl">Nenhum item encontrado</h3>
            <p className="text-sm text-slate-400">Tente ajustar seus filtros ou busca.</p>
          </div>
        </div>
      )}
    </div>
  );
}
