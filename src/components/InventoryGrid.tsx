import { useState, useMemo, ReactNode } from 'react';
import { Wine, Spirit, Adega } from '../types';
import { WineCard } from './WineCard';
import { SpiritCard } from './SpiritCard';
import { Search, Filter, X, Star, Droplet, ALargeSmall, Hourglass } from 'lucide-react';
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
function SortButton({ active, onClick, icon, title }: { active: boolean; onClick: () => void; icon: ReactNode; title: string }) {
  return (
    <button 
      onClick={onClick}
      title={title}
      className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${
        active 
          ? 'bg-brand-wine text-white border-brand-wine shadow-md scale-105' 
          : 'bg-white border-black/10 text-text-sub hover:bg-cream-dark shadow-sm'
      }`}
    >
      {icon}
    </button>
  );
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

  const normalizeText = (text: string) => 
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
  
  const filteredGroupedItems = useMemo(() => {
    const next: Record<string, any[]> = {};
    const normalizedSearch = normalizeText(search);

    Object.entries(groupedItems).forEach(([group, items]) => {
      const filtered = items.filter(item => {
        const normalizedName = normalizeText(item.name);
        const normalizedProducer = normalizeText(item.producer || '');
        const normalizedNotes = normalizeText(item.notes || '');

        const matchSearch = 
          normalizedName.includes(normalizedSearch) ||
          normalizedProducer.includes(normalizedSearch) ||
          normalizedNotes.includes(normalizedSearch);
        
        const matchType = !filters.type || item.type === filters.type;
        const matchCountry = !filters.country || item.country === filters.country;
        const matchVintage = !filters.vintage || (item as Wine).vintage === filters.vintage;
        
        const isReady = (item as Wine).drinkFrom && (item as Wine).drinkUntil && 
                        new Date().getFullYear() >= (item as Wine).drinkFrom! && 
                        new Date().getFullYear() <= (item as Wine).drinkUntil!;
        const matchReady = !filters.readyOnly || isReady;

        return matchSearch && matchType && matchCountry && matchVintage && matchReady;
      }).sort((a, b) => {
        // 1. Identify "Consumed" (Empty) state
        // A Wine is consumed if qty <= 0.
        // A Spirit is consumed if:
        // - qty <= 0 (Total stock is zero)
        // - OR qty is 1, and that single bottle is already open and empty.
        const spiritA = a as Spirit;
        const spiritB = b as Spirit;
        
        const isConsumedA = mode === 'wines' 
          ? (a as Wine).qty <= 0 
          : spiritA.qty <= 0 || (spiritA.qty <= 1 && spiritA.isOpen && spiritA.level <= 0);
        const isConsumedB = mode === 'wines' 
          ? (b as Wine).qty <= 0 
          : spiritB.qty <= 0 || (spiritB.qty <= 1 && spiritB.isOpen && spiritB.level <= 0);
        
        // Rule: Consumed items ALWAYS go to bottom, regardless of sort criteria
        if (isConsumedA && !isConsumedB) return 1;
        if (!isConsumedA && isConsumedB) return -1;
        
        // 2. Apply Primary Sort Criteria
        let comparison = 0;
        
        if (sortBy === 'level') {
          // "Vazio para cheio" (Ascending: 0 -> 100)
          const valA = mode === 'wines' ? (a as Wine).qty : (a as Spirit).level;
          const valB = mode === 'wines' ? (b as Wine).qty : (b as Spirit).level;
          comparison = Number(valA || 0) - Number(valB || 0);
        } else if (sortBy === 'score') {
          // "Mais pontuado para menos" (Descending)
          comparison = (Number(b.score || 0)) - (Number(a.score || 0));
        } else if (sortBy === 'readiness' && mode === 'wines') {
          // "Mais pronto para beber" (Ascending - lower drinkUntil means needs to be drunk sooner)
          const wineA = a as Wine;
          const wineB = b as Wine;
          const endA = wineA.drinkUntil || 9999;
          const endB = wineB.drinkUntil || 9999;
          comparison = endA - endB;
        } else {
          // Default: Name (A-Z)
          comparison = a.name.localeCompare(b.name);
        }

        // 3. Secondary Sort: Name (Consistency)
        if (comparison === 0) {
          return a.name.localeCompare(b.name);
        }
        return comparison;
      });
      if (filtered.length > 0) next[group] = filtered;
    });
    return next;
  }, [groupedItems, search, filters, sortBy, mode]);

  const uniqueCountries = useMemo(() => [...new Set(allItems.map(i => i.country).filter(Boolean))].sort(), [allItems]);
  const uniqueTypes = useMemo(() => [...new Set(allItems.map(i => i.type))].sort(), [allItems]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar - Forced Single Line */}
      <div className="flex flex-row items-center gap-1.5 sm:gap-3 bg-white/80 backdrop-blur-md border border-black/5 rounded-[24px] p-2 mb-3 shadow-old overflow-x-auto no-scrollbar">
        {/* Compact Search Input (Much smaller) */}
        <div className="relative w-[42%] min-w-[120px] shrink-0 ml-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted opacity-40" size={14} />
          <input 
            type="text"
            placeholder={`Buscar...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-cream-dark/50 border border-black/5 rounded-2xl py-2 pl-9 pr-8 text-[16px] sm:text-[13px] font-bold outline-none focus:border-brand-wine/20 transition-all text-text-main"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand-wine p-0.5">
              <X size={12} />
            </button>
          )}
        </div>
        
        {/* The 5 Predefined Action Buttons - Same Line */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto pr-1">
          {mode === 'spirits' && (
            <SortButton 
              active={sortBy === 'level'} 
              onClick={() => setSortBy(sortBy === 'level' ? 'name' : 'level')}
              icon={<Droplet size={18} />}
              title="Nível"
            />
          )}
          <SortButton 
            active={sortBy === 'name'} 
            onClick={() => setSortBy('name')}
            icon={<ALargeSmall size={18} />}
            title="A-Z"
          />
          {mode === 'wines' && (
            <SortButton 
              active={sortBy === 'readiness'} 
              onClick={() => setSortBy(sortBy === 'readiness' ? 'name' : 'readiness')}
              icon={<Hourglass size={18} />}
              title="Prontos"
            />
          )}
          <SortButton 
            active={sortBy === 'score'} 
            onClick={() => setSortBy(sortBy === 'score' ? 'name' : 'score')}
            icon={<Star size={18} />}
            title="Pontuados"
          />
          
          <div className="w-[1px] h-5 bg-black/5 mx-0.5" />

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`w-10 h-10 flex items-center justify-center rounded-2xl border transition-all shrink-0 ${
              showFilters 
                ? 'bg-brand-wine text-white border-brand-wine shadow-md' 
                : 'bg-white border-black/10 text-text-sub hover:bg-cream-dark'
            }`}
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

      <div className="space-y-6">
        {Object.entries(filteredGroupedItems).map(([group, sectionItems]: [string, any[]]) => {
          const totalQty = sectionItems.reduce((acc, item) => acc + (item.qty || 0), 0);
          const scoredItems = sectionItems.filter(i => i.score);
          const avgScore = scoredItems.length 
            ? (scoredItems.reduce((acc, i) => acc + (i.score || 0), 0) / scoredItems.length).toFixed(1)
            : null;

          return (
            <div key={group || 'all'} className="space-y-4">
              {groupBy !== 'none' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cream-dark border border-black/5 rounded-2xl px-5 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="bg-brand-wine text-white text-[12px] font-bold px-4 py-1 rounded-lg font-serif italic shadow-sm">
                      {groupBy === 'adegaId' ? adegas.find(a => a.id === group)?.name || group : group}
                    </span>
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest pl-1">
                      {totalQty} {totalQty === 1 ? 'Garrafa' : 'Garrafas'}
                    </span>
                  </div>
                  
                  {avgScore && (
                    <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-text-sub shrink-0">
                      <div className="flex items-center gap-1.5 text-brand-gold">
                        <Star size={12} fill="currentColor" />
                        <span>Média: {avgScore}</span>
                      </div>
                    </div>
                  )}
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
          );
        })}
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
