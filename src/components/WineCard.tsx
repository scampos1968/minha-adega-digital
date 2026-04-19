import { Wine, Adega } from '../types';
import { Star, MessageSquareCode, GlassWater, Package, Trash2, Edit3, Camera, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface WineCardProps {
  wine: Wine;
  adega?: Adega;
  onWineClick?: (wine: Wine) => void;
  onDrink?: (wine: Wine) => void;
  onEdit?: (wine: Wine) => void;
  onDelete?: (wine: Wine) => void;
  onStock?: (wine: Wine) => void;
  onExpert?: (wine: Wine) => void;
  isAdmin: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  Tinto: 'text-indigo-900',
  Branco: 'text-emerald-800',
  Rosé: 'text-rose-800',
  Espumante: 'text-sky-800',
  Sobremesa: 'text-amber-800',
  Laranja: 'text-orange-800',
  Porto: 'text-violet-800',
};

const TYPE_BGS: Record<string, string> = {
  Tinto: 'bg-indigo-50',
  Branco: 'bg-emerald-50',
  Rosé: 'bg-rose-50',
  Espumante: 'bg-sky-50',
  Sobremesa: 'bg-amber-50',
  Laranja: 'bg-orange-50',
  Porto: 'bg-violet-50',
};

export function WineCard({ wine, adega, onDrink, onEdit, onDelete, onStock, onExpert, isAdmin }: WineCardProps) {
  const textColor = TYPE_COLORS[wine.type] || 'text-wine';
  const bgColor = TYPE_BGS[wine.type] || 'bg-cream2';

  const isEmpty = wine.qty === 0 || (['Porto', 'Sobremesa'].includes(wine.type) && wine.level === 0);

  return (
    <motion.div 
      layout
      className={`group bg-white rounded-2xl border border-parchment/20 shadow-sh overflow-hidden flex flex-col transition-all hover:shadow-sh2 hover:-translate-y-1 ${isEmpty ? 'opacity-60' : ''}`}
    >
      {/* Image Area */}
      <div className={`relative h-48 flex items-center justify-center overflow-hidden ${bgColor}`}>
        {wine.imageUrl ? (
          <img 
            src={wine.imageUrl} 
            alt={wine.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-30">
            <span className="text-5xl">🍷</span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${textColor}`}>{wine.type}</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute inset-0 p-3 flex flex-col justify-between pointer-events-none">
          <div className="flex justify-between items-start">
            {wine.vintage && (
              <div className="bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm">
                {wine.vintage}
              </div>
            )}
            {wine.score && (
              <div className="bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-gold flex items-center gap-1 shadow-sm">
                <Star size={10} fill="currentColor" />
                {wine.score} pts
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-end">
            <div className={`px-2 py-1 rounded-lg text-[9px] font-bold text-white shadow-sm ${textColor.replace('text-', 'bg-')} opacity-90`}>
              {wine.type.toUpperCase()}
            </div>
            {isEmpty && (
              <div className="bg-zinc-800/80 backdrop-blur px-2 py-1 rounded-lg text-[9px] font-bold text-white">
                ✓ CONSUMIDO
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-1">
        <h3 className="font-serif italic text-base leading-tight min-h-[2.5rem] flex items-center">
          {wine.name}
        </h3>
        {wine.producer && (
          <p className="text-xs text-text-muted truncate">{wine.producer}</p>
        )}
        {(wine.country || wine.grape) && (
          <p className="text-[10px] text-text-sub flex items-center gap-1">
            {wine.country} {wine.country && wine.grape && '·'} {wine.grape}
          </p>
        )}
        
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-parchment/10">
          <div className="flex items-center gap-1.5 overflow-hidden text-xs text-text-muted font-medium">
             <span>{"🍾".repeat(Math.min(wine.qty, 3))}</span>
             {wine.qty > 3 && <span className="text-[10px] opacity-50">+{wine.qty-3}</span>}
             <span className="ml-0.5">{wine.qty} un</span>
          </div>
          {adega && (
            <div className="text-[10px] text-text-sub bg-cream2 px-1.5 py-0.5 rounded-md flex items-center gap-1 max-w-[80px] truncate">
              <span>{adega.emoji}</span>
              <span className="truncate">{adega.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-4 border-t border-slate-100 bg-slate-50/30">
        {isAdmin ? (
          <>
            <ActionButton icon={<Edit3 size={12} />} label="Editar" onClick={() => onEdit?.(wine)} />
            <ActionButton icon={<BookOpen size={12} />} label="Ficha" onClick={() => onExpert?.(wine)} />
            <ActionButton icon={<GlassWater size={12} />} label="Beber" onClick={() => onDrink?.(wine)} />
            <ActionButton icon={<Trash2 size={12} />} label="Del" onClick={() => onDelete?.(wine)} />
          </>
        ) : (
          <>
            <ActionButton icon={<BookOpen size={12} />} label="Análise" onClick={() => onExpert?.(wine)} className="col-span-2" />
            <ActionButton icon={<GlassWater size={12} />} label="Registrar Consumo" onClick={() => onDrink?.(wine)} className="col-span-2" />
          </>
        )}
      </div>
    </motion.div>
  );
}

function ActionButton({ icon, label, onClick, className = '' }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-2.5 flex flex-col items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 hover:text-indigo-600 border-r border-slate-100 last:border-r-0 transition-all ${className}`}
    >
      {icon}
      <span className="hidden sm:inline-block">{label}</span>
    </button>
  );
}
