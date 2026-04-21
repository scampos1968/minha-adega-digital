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
        className={`group bg-white rounded-[28px] border border-black/5 shadow-old overflow-hidden flex flex-col transition-all active:scale-[0.98] ${!isAvailable ? 'opacity-[0.6]' : ''}`}
      >
        <div 
          className={`relative h-[200px] flex items-center justify-center overflow-hidden bg-cream-dark cursor-zoom-in`}
          onClick={() => spirit.imageUrl && setShowZoom(true)}
        >
          {spirit.imageUrl ? (
            <img 
              src={spirit.imageUrl} 
              alt={spirit.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-20">
              <span className="text-6xl">🥃</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B4513] mt-2">{spirit.type}</span>
            </div>
          )}

          {spirit.imageUrl && (
            <div className="absolute top-3 right-3 p-2 bg-black/10 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <Maximize2 size={12} />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent z-10" />
          
          <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none z-10">
            <div className="flex justify-between items-start">
               <div className="bg-white/90 px-3 py-1 rounded-full text-[10px] font-bold text-text-main shadow-sm backdrop-blur-sm tracking-tight capitalize">
                  {spirit.type}
                </div>
              {spirit.score && (
                <div className="bg-brand-gold px-3 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-1 shadow-md tracking-tight capitalize">
                  <Star size={10} fill="currentColor" />
                  {spirit.score}
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-end gap-1">
              <div className={`px-2 py-0.5 rounded-full text-[8px] font-bold text-white shadow-sm backdrop-blur-sm ${getLevelColor(spirit.isOpen ? spirit.level : 100)} opacity-90 whitespace-nowrap`}>
                {spirit.isOpen && spirit.level === 0 ? 'Vazia' : `Nív. ${spirit.isOpen ? spirit.level : 100}%`}
              </div>
              {spirit.abv && (
                <div className="bg-white/90 px-2 py-0.5 rounded-full text-[8px] font-bold text-text-muted backdrop-blur-sm whitespace-nowrap">
                  {spirit.abv}% vol
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 pt-4 pb-4 flex-1 flex flex-col gap-0.5 min-h-[120px] bg-white relative z-20">
          <h3 className="font-serif italic text-text-main text-[17px] leading-tight h-[2.8rem] overflow-hidden line-clamp-2 flex items-center pr-2">
            {spirit.name}
          </h3>
          {spirit.producer && (
            <p className="text-[13px] font-bold text-text-sub truncate opacity-70">{spirit.producer}</p>
          )}
          {(spirit.country || spirit.aging) && (
            <p className="text-[12px] text-text-muted flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-gold/40" />
              {spirit.country} {spirit.country && spirit.aging && '·'} {spirit.aging}
            </p>
          )}

          <div className="mt-auto pt-3 flex items-center justify-between border-t border-black/5">
            <div className="flex items-center gap-1 text-[11px] text-text-main font-bold">
               <Package size={12} className={spirit.isOpen ? 'text-emerald-700' : 'text-brand-wine/40'} />
               <span>{spirit.isOpen ? 'Aberta' : `${spirit.qty} un`}</span>
            </div>
            {adega && (
              <div className="flex items-center gap-1 text-[10px] text-text-sub font-bold">
                <span>{adega.emoji}</span>
                <span>{adega.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className={`px-2 pb-2 pt-0 grid ${isAdmin ? 'grid-cols-5 gap-1' : 'grid-cols-2 gap-2'}`}>
          {isAdmin ? (
            <>
              <CircularAction icon={<Edit3 size={13} />} color="bg-cream-deep text-text-sub" onClick={() => onEdit?.(spirit)} admin />
              <CircularAction icon={<BookOpen size={13} />} color="bg-brand-wine/10 text-brand-wine" onClick={() => onExpert?.(spirit)} admin />
              <CircularAction icon={<GlassWater size={13} />} color="bg-brand-wine text-white" onClick={() => onDrink?.(spirit)} admin />
              <CircularAction icon={<Package size={13} />} color="bg-cream-deep text-text-sub" onClick={() => onStock?.(spirit)} admin />
              <CircularAction icon={<Trash2 size={13} />} color="bg-red-50 text-red-600" onClick={() => onDelete?.(spirit)} admin />
            </>
          ) : (
            <>
              <CircularAction icon={<BookOpen size={18} />} label="Análise" color="bg-brand-wine/10 text-brand-wine" onClick={() => onExpert?.(spirit)} showLabel />
              <CircularAction icon={<GlassWater size={18} />} label="Beber" color="bg-brand-wine text-white" onClick={() => onDrink?.(spirit)} showLabel />
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

function CircularAction({ icon, label, onClick, className = '', color = '', showLabel = false, admin = false }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex flex-col items-center justify-center gap-1 transition-all active:scale-90 ${className}`}
    >
      <div className={`${admin ? 'w-full aspect-square' : 'w-10 h-10 sm:w-11 sm:h-11'} flex items-center justify-center rounded-xl shadow-sm ${color}`}>
        {icon}
      </div>
      {showLabel && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</span>
      )}
    </button>
  );
}
