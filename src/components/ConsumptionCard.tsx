import React from 'react';
import { Consumption, SpiritConsumption, Wine, Spirit } from '../types';
import { motion } from 'motion/react';
import { Calendar, Quote, Star, MapPin, Wine as WineIcon, GlassWater } from 'lucide-react';

interface ConsumptionCardProps {
  consumption: Consumption | SpiritConsumption;
  isSpirit: boolean;
}

export const ConsumptionCard: React.FC<ConsumptionCardProps> = ({ consumption, isSpirit }) => {
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
      className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
    >
      <div className="flex gap-4 md:gap-6 relative z-10">
        {/* Banner/Icon */}
        <div className={`w-12 h-16 md:w-16 md:h-20 rounded-xl flex items-center justify-center text-3xl shrink-0 ${isSpirit ? 'bg-slate-100 text-slate-800' : 'bg-indigo-50 text-indigo-600'}`}>
          {isSpirit ? <GlassWater size={24} /> : <WineIcon size={24} />}
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-start gap-2">
            <div>
              <h3 className="text-lg font-serif italic font-bold text-text-main leading-tight">{snapshot.name}</h3>
              <div className="flex items-center gap-2 text-xs text-text-sub mt-1">
                <Calendar size={12} />
                <span>{dateStr}</span>
                {consumption.occasion && (
                   <>
                    <span className="w-1 h-1 rounded-full bg-parchment/40" />
                    <span>{consumption.occasion}</span>
                   </>
                )}
              </div>
            </div>
            {consumption.score && (
              <div className="flex gap-0.5 text-gold">
                {[...Array(consumption.score)].map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
             <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
               {isSpirit ? (snapshot as Spirit).type : (snapshot as Wine).type}
             </span>
             <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200 flex items-center gap-1">
               <MapPin size={8} />
               {snapshot.country}
             </span>
             {(consumption as any).qty > 0 && (
               <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
                 Garrafa Finalizada
               </span>
             )}
          </div>

          {consumption.notes && (
            <div className="pt-3 border-t border-parchment/10 flex gap-3">
              <Quote size={16} className="text-gold opacity-30 shrink-0" />
              <p className="text-sm text-text-muted font-sans italic leading-relaxed">{consumption.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Subtle Background Text */}
      <div className="absolute -bottom-2 -right-2 text-6xl font-serif italic text-slate-100 select-none pointer-events-none opacity-20 transform rotate-12">
        {isSpirit ? 'Spirit' : 'Vinho'}
      </div>
    </motion.div>
  );
};
