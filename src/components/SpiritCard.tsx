import { Spirit, Adega } from '../types';
import { Star, MessageSquareCode, GlassWater, Package, Trash2, Edit3, Droplets, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface SpiritCardProps {
  spirit: Spirit;
  adega?: Adega;
  onDrink?: (spirit: Spirit) => void;
  onEdit?: (spirit: Spirit) => void;
  onDelete?: (spirit: Spirit) => void;
  onStock?: (spirit: Spirit) => void;
  onExpert?: (spirit: Spirit) => void;
  isAdmin: boolean;
}

export function SpiritCard({ spirit, adega, onDrink, onEdit, onDelete, onStock, onExpert, isAdmin }: SpiritCardProps) {
  const isAvailable = (!spirit.isOpen && spirit.qty > 0) || (spirit.isOpen && spirit.level > 0);
  
  const getLevelColor = (l: number) => {
    if (l >= 75) return 'bg-green-600';
    if (l >= 50) return 'bg-amber-500';
    if (l >= 25) return 'bg-orange-500';
    return 'bg-red-600';
  };

  return (
    <motion.div 
      layout
      className={`group bg-white rounded-2xl border border-parchment/20 shadow-sh overflow-hidden flex flex-col transition-all hover:shadow-sh2 hover:-translate-y-1 ${!isAvailable ? 'opacity-60' : ''}`}
    >
      <div className={`relative h-48 flex items-center justify-center overflow-hidden bg-slate-100`}>
        {spirit.imageUrl ? (
          <img 
            src={spirit.imageUrl} 
            alt={spirit.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-30">
            <span className="text-5xl">🥃</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-800">{spirit.type}</span>
          </div>
        )}
        
        <div className="absolute inset-0 p-3 flex flex-col justify-between pointer-events-none">
          <div className="flex justify-between items-start">
             <div className="bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm">
                {spirit.type}
              </div>
            {spirit.score && (
              <div className="bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-gold flex items-center gap-1 shadow-sm">
                <Star size={10} fill="currentColor" />
                {spirit.score}
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-end">
            <div className={`px-2 py-1 rounded-lg text-[9px] font-bold text-white shadow-sm ${getLevelColor(spirit.isOpen ? spirit.level : 100)}`}>
              NÍVEL: {spirit.isOpen ? spirit.level : 100}%
            </div>
            {spirit.abv && (
              <div className="bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[9px] font-bold text-text-muted">
                {spirit.abv}%
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-1">
        <h3 className="font-serif italic text-base leading-tight min-h-[2.5rem] flex items-center">
          {spirit.name}
        </h3>
        {spirit.producer && (
          <p className="text-xs text-text-muted truncate">{spirit.producer}</p>
        )}
        {(spirit.country || spirit.aging) && (
          <p className="text-[10px] text-text-sub flex items-center gap-1">
            {spirit.country} {spirit.country && spirit.aging && '·'} {spirit.aging}
          </p>
        )}
        
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-parchment/10">
          <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
             <Package size={12} className={spirit.isOpen ? 'text-green-600' : 'text-blue-600'} />
             <span>{spirit.isOpen ? 'ABERTA' : `${spirit.qty} un.`}</span>
          </div>
          {adega && (
            <div className="text-[10px] text-text-sub bg-cream2 px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <span>{adega.emoji}</span>
              <span>{adega.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 border-t border-slate-100 bg-slate-50/30">
        {isAdmin ? (
          <>
            <ActionButton icon={<Edit3 size={11} />} label="Editar" onClick={() => onEdit?.(spirit)} />
            <ActionButton icon={<BookOpen size={11} />} label="Análise" onClick={() => onExpert?.(spirit)} />
            <ActionButton icon={<Package size={11} />} label="Estoque" onClick={() => onStock?.(spirit)} />
            <ActionButton icon={<GlassWater size={11} />} label="Consumo" onClick={() => onDrink?.(spirit)} />
            <ActionButton icon={<Trash2 size={11} />} label="Apagar" onClick={() => onDelete?.(spirit)} className="text-red-400 hover:text-red-600" />
          </>
        ) : (
          <>
            <ActionButton icon={<BookOpen size={12} />} label="Análise" onClick={() => onExpert?.(spirit)} className="col-span-2" />
            <ActionButton icon={<GlassWater size={12} />} label="Consumo" onClick={() => onDrink?.(spirit)} className="col-span-2" />
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
