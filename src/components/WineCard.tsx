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
  const textColor = TYPE_COLORS[wine.type] || 'text-indigo-600';
  const bgColor = TYPE_BGS[wine.type] || 'bg-slate-50';

  const isEmpty = wine.qty === 0 || (['Porto', 'Sobremesa'].includes(wine.type) && wine.level === 0);

  return (
    <motion.div 
      layout
      className={`group bg-white rounded-[16px] border border-black/10 shadow-old overflow-hidden flex flex-col transition-all hover:shadow-old-lg hover:-translate-y-1 ${isEmpty ? 'opacity-[0.55]' : ''}`}
    >
      {/* Image Area */}
      <div className={`relative h-[185px] flex items-center justify-center overflow-hidden bg-cream-dark`}>
        {wine.imageUrl ? (
          <img 
            src={wine.imageUrl} 
            alt={wine.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-30">
            <span className="text-5xl">🍷</span>
            <span className={`text-[11px] font-medium uppercase tracking-[1.2px] text-brand-wine`}>{wine.type}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-transparent pt-[45%]" />
        
        {/* Badges */}
        <div className="absolute inset-0 p-3 flex flex-col justify-between pointer-events-none z-10">
          <div className="flex justify-between items-start">
            {wine.vintage ? (
              <div className="bg-white/88 px-2.5 py-1 rounded-[20px] text-[11px] font-medium text-brand-wine shadow-sm backdrop-blur-sm">
                {wine.vintage}
              </div>
            ) : <div />}
            {wine.score && (
              <div className="bg-white/88 px-2.5 py-1 rounded-[20px] text-[11px] font-medium text-brand-gold flex items-center gap-1 shadow-sm backdrop-blur-sm">
                <Star size={11} fill="currentColor" />
                {wine.score} pts
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-end">
            <div className="bg-brand-wine/85 px-2 py-0.5 rounded-[20px] text-[10px] font-medium text-white shadow-sm backdrop-blur-sm uppercase tracking-[0.3px]">
              {wine.type}
            </div>
            {isEmpty ? (
              <div className="bg-black/60 px-2 py-0.5 rounded-[20px] text-[10px] font-medium text-white backdrop-blur-sm">
                {wine.type === 'Porto' || wine.type === 'Sobremesa' ? '✓ VAZIA' : '✓ CONSUMIDO'}
              </div>
            ) : (
              (wine.drinkFrom && wine.drinkUntil && 
               new Date().getFullYear() >= wine.drinkFrom && 
               new Date().getFullYear() <= wine.drinkUntil) && (
                <div className="bg-emerald-700/85 px-2 py-0.5 rounded-[20px] text-[10px] font-medium text-white shadow-sm backdrop-blur-sm">
                   🎯 NO PONTO
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 pt-3.5 pb-3 flex-1 flex flex-col gap-1 min-h-[110px]">
        <h3 className="font-serif italic text-text-main text-[15px] leading-tight min-h-[2.5rem] flex items-center">
          {wine.name}
        </h3>
        {wine.producer && (
          <p className="text-[12px] text-text-sub truncate">{wine.producer}</p>
        )}
        {(wine.country || wine.grape) && (
          <p className="text-[12px] text-text-muted flex items-center gap-1">
            {wine.country} {wine.country && wine.grape && '·'} {wine.grape}
          </p>
        )}
        
        <div className="mt-auto pt-2.5 flex items-center justify-between border-t border-black/5">
          <div className="flex items-center gap-1 text-[12px] text-text-sub font-normal">
             <span>{"🍾".repeat(Math.min(wine.qty, 4))}</span>
             {wine.qty > 4 && <span className="text-[11px] text-text-muted">+{wine.qty-4}</span>}
             <span className="ml-1">{wine.qty} un</span>
          </div>
          {adega && (
            <div className="text-[11px] text-text-muted font-normal">
              <span>{adega.emoji}</span>
              <span className="ml-1">{adega.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={`grid ${isAdmin ? 'grid-cols-[0.7fr_1fr_1.8fr_0.7fr_0.7fr]' : 'grid-cols-2'} border-t border-black/10`}>
        {isAdmin ? (
          <>
            <ActionButton icon={<Edit3 size={12} />} label="Editar" onClick={() => onEdit?.(wine)} />
            <ActionButton icon={<BookOpen size={12} />} label="Análise" onClick={() => onExpert?.(wine)} showLabel />
            <ActionButton icon={<GlassWater size={12} />} label="Consumo" onClick={() => onDrink?.(wine)} showLabel />
            <ActionButton icon={<Package size={12} />} label="Estoque" onClick={() => onStock?.(wine)} />
            <ActionButton icon={<Trash2 size={12} />} label="Apagar" onClick={() => onDelete?.(wine)} className="hover:bg-red-50 hover:text-red-700" />
          </>
        ) : (
          <>
            <ActionButton icon={<BookOpen size={13} />} label="Análise" onClick={() => onExpert?.(wine)} showLabel />
            <ActionButton icon={<GlassWater size={13} />} label="Consumo" onClick={() => onDrink?.(wine)} showLabel />
          </>
        )}
      </div>
    </motion.div>
  );
}

function ActionButton({ icon, label, onClick, className = '', showLabel = false }: any) {
  return (
    <button 
      onClick={onClick}
      className={`py-2.5 border-l border-black/10 first:border-l-0 flex items-center justify-center gap-1.5 text-[10px] uppercase font-sans text-text-sub hover:bg-cream-dark transition-colors ${className}`}
    >
      <span className="flex items-center">{icon}</span>
      {(showLabel || window.innerWidth > 640) && <span className="hidden xs:inline">{label}</span>}
    </button>
  );
}
