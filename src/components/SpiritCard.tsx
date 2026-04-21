import React, { useState } from 'react';
import { Spirit, Adega } from '../types';
import { Star, MessageSquareCode, GlassWater, Package, Trash2, Edit3, Droplets, BookOpen, X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [showZoom, setShowZoom] = useState(false);
  const isAvailable = (!spirit.isOpen && spirit.qty > 0) || (spirit.isOpen && spirit.level > 0);
  
  const getLevelColor = (l: number) => {
    if (l >= 75) return 'bg-green-600';
    if (l >= 50) return 'bg-amber-500';
    if (l >= 25) return 'bg-orange-500';
    return 'bg-red-600';
  };

  return (
    <>
      <motion.div 
        layout
        className={`group bg-white rounded-[16px] border border-black/10 shadow-old overflow-hidden flex flex-col transition-all hover:shadow-old-lg hover:-translate-y-1 ${!isAvailable ? 'opacity-[0.55]' : ''}`}
      >
        <div 
          className={`relative h-[185px] flex items-center justify-center overflow-hidden bg-cream-dark cursor-zoom-in`}
          onClick={() => spirit.imageUrl && setShowZoom(true)}
        >
          {spirit.imageUrl ? (
            <img 
              src={spirit.imageUrl} 
              alt={spirit.name} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-30">
              <span className="text-5xl">🥃</span>
              <span className="text-[11px] font-medium uppercase tracking-[1.2px] text-[#8B4513]">{spirit.type}</span>
            </div>
          )}

          {spirit.imageUrl && (
            <div className="absolute top-2 right-2 p-1.5 bg-black/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <Maximize2 size={12} />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-transparent pt-[45%] z-10" />
          
          <div className="absolute inset-0 p-3 flex flex-col justify-between pointer-events-none z-10">
            <div className="flex justify-between items-start">
               <div className="bg-white/88 px-2.5 py-1 rounded-[20px] text-[9.5px] font-medium text-text-main shadow-sm backdrop-blur-sm [font-variant:small-caps] capitalize">
                  {spirit.type}
                </div>
              {spirit.score && (
                <div className="bg-white/88 px-2.5 py-1 rounded-[20px] text-[9.5px] font-medium text-brand-gold flex items-center gap-1 shadow-sm backdrop-blur-sm [font-variant:small-caps] capitalize">
                  <Star size={10} fill="currentColor" />
                  {spirit.score} Pts
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-end">
              <div className={`px-2 py-0.5 rounded-[20px] text-[9px] font-medium text-white shadow-sm backdrop-blur-sm ${getLevelColor(spirit.isOpen ? spirit.level : 100)} opacity-90 [font-variant:small-caps] capitalize tracking-wide`}>
                {spirit.isOpen && spirit.level === 0 ? 'Vazia' : `Nível: ${spirit.isOpen ? spirit.level : 100}%`}
              </div>
              {spirit.abv && (
                <div className="bg-white/88 px-2 py-0.5 rounded-[20px] text-[8.5px] font-medium text-text-muted backdrop-blur-sm [font-variant:small-caps] capitalize">
                  {spirit.abv}% Abv
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 pt-3.5 pb-3 flex-1 flex flex-col gap-1 min-h-[110px]">
          <h3 className="font-serif italic text-text-main text-[15px] leading-tight min-h-[2.5rem] flex items-center">
            {spirit.name}
          </h3>
          {spirit.producer && (
            <p className="text-[12px] text-text-sub truncate">{spirit.producer}</p>
          )}
          {(spirit.country || spirit.aging) && (
            <p className="text-[12px] text-text-muted flex items-center gap-1">
              {spirit.country} {spirit.country && spirit.aging && '·'} {spirit.aging}
            </p>
          )}
          
          <div className="mt-auto pt-2.5 flex items-center justify-between border-t border-black/5">
            <div className="flex items-center gap-1.5 text-[12px] text-text-sub font-normal">
               <Package size={13} className={spirit.isOpen ? 'text-emerald-700' : 'text-brand-wine'} />
               <span>{spirit.isOpen ? 'ABERTA' : `${spirit.qty} un.`}</span>
            </div>
            {adega && (
              <div className="text-[11px] text-text-muted font-normal">
                <span>{adega.emoji}</span>
                <span className="ml-1">{adega.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className={`grid ${isAdmin ? 'grid-cols-[0.7fr_1fr_1.8fr_0.7fr_0.7fr]' : 'grid-cols-2'} border-t border-black/10`}>
          {isAdmin ? (
            <>
              <ActionButton icon={<Edit3 size={12} />} label="Editar" onClick={() => onEdit?.(spirit)} />
              <ActionButton icon={<BookOpen size={12} />} label="Análise" onClick={() => onExpert?.(spirit)} showLabel />
              <ActionButton icon={<GlassWater size={12} />} label="Consumo" onClick={() => onDrink?.(spirit)} showLabel />
              <ActionButton icon={<Package size={12} />} label="Estoque" onClick={() => onStock?.(spirit)} />
              <ActionButton icon={<Trash2 size={12} />} label="Apagar" onClick={() => onDelete?.(spirit)} className="hover:bg-red-50 hover:text-red-700" />
            </>
          ) : (
            <>
              <ActionButton icon={<BookOpen size={13} />} label="Análise" onClick={() => onExpert?.(spirit)} showLabel />
              <ActionButton icon={<GlassWater size={13} />} label="Consumo" onClick={() => onDrink?.(spirit)} showLabel />
            </>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showZoom && spirit.imageUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowZoom(false)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-full max-h-full"
            >
              <img 
                src={spirit.imageUrl} 
                alt={spirit.name}
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
              <button 
                onClick={(e) => { e.stopPropagation(); setShowZoom(false); }}
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
                title="Fechar"
              >
                <X size={32} />
              </button>
              <div className="absolute -bottom-12 left-0 right-0 text-center text-white/80 font-serif italic text-lg">
                {spirit.name}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
