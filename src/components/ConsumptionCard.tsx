import React from 'react';
import { Consumption, SpiritConsumption, Wine, Spirit } from '../types';
import { motion } from 'motion/react';
import { Calendar, Quote, Star, MapPin, Wine as WineIcon, GlassWater, Trash2 } from 'lucide-react';

interface ConsumptionCardProps {
  consumption: Consumption | SpiritConsumption;
  isSpirit: boolean;
  isAdmin?: boolean;
  onDelete?: (id: string, isSpirit: boolean) => void;
}

export const ConsumptionCard: React.FC<ConsumptionCardProps> = ({ consumption, isSpirit, isAdmin, onDelete }) => {
  const dateStr = new Date(consumption.date).toLocaleDateString('pt-BR', { 
    day: '2-digit', month: 'short', year: 'numeric' 
  });

  const snapshot = isSpirit 
    ? (consumption as SpiritConsumption).spiritSnapshot 
    : (consumption as Consumption).wineSnapshot;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-4 items-center py-4 border-b border-black/5 group"
    >
      {/* Thumbnail */}
      <div className={`w-[34px] h-[46px] rounded-lg flex items-center justify-center text-lg shrink-0 overflow-hidden ${isSpirit ? 'bg-cream-dark' : 'bg-brand-wine/10'}`}>
        {snapshot.imageUrl ? (
          <img src={snapshot.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="opacity-50">{isSpirit ? '🥃' : '🍷'}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif italic text-[16px] text-text-main truncate">{snapshot.name}</h3>
              {consumption.score && (
                <span className="text-[11px] px-2 py-0.25 bg-brand-gold/10 text-brand-gold rounded-lg font-medium flex items-center gap-0.5">
                  <Star size={10} fill="currentColor" />
                  {consumption.score} pts
                </span>
              )}
            </div>
            <div className="text-[12px] text-text-sub mt-0.5">
              <span>{dateStr}</span>
              {consumption.occasion && <span className="opacity-60 before:content-['·'] before:mx-1.5">{consumption.occasion}</span>}
              {snapshot.country && <span className="opacity-60 before:content-['·'] before:mx-1.5">{snapshot.country}</span>}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isAdmin && onDelete && (
              <button 
                onClick={() => onDelete(consumption.id, isSpirit)}
                className="p-1.5 text-text-muted hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                title="Remover"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {consumption.notes && (
          <div className="mt-1.5">
             <p className="text-[12px] italic text-text-sub bg-cream-dark/50 inline-block px-2.5 py-1 rounded-lg border border-black/5 leading-relaxed">
               {consumption.notes}
             </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
