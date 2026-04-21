import React, { useState } from 'react';
import { Wine, Adega } from '../types';
import { Star, GlassWater, Package, Trash2, Edit3, BookOpen, X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WineCardProps {
  wine: Wine;
  adega?: Adega;
  onDrink?: (wine: Wine) => void;
  onEdit?: (wine: Wine) => void;
  onDelete?: (wine: Wine) => void;
  onStock?: (wine: Wine) => void;
  onExpert?: (wine: Wine) => void;
  isAdmin: boolean;
}

function getDrinkStatus(wine: Wine) {
  if (!wine.drinkFrom || !wine.drinkUntil) return null;
  const yr = new Date().getFullYear();
  if (yr > wine.drinkUntil)
    return { icon: '🚫', text: `Passou do ponto (${wine.drinkUntil})`, color: 'text-red-500' };
  if (wine.drinkUntil - yr <= 1)
    return { icon: '⚠️', text: 'Passando do ponto', color: 'text-amber-500' };
  if (yr >= wine.drinkFrom)
    return { icon: '🎯', text: `Melhor até: ${wine.drinkUntil}`, color: 'text-emerald-600' };
  return null;
}

export function WineCard({ wine, adega, onDrink, onEdit, onDelete, onStock, onExpert, isAdmin }: WineCardProps) {
  const [showZoom, setShowZoom] = useState(false);
  const isEmpty = wine.qty === 0 || (['Porto', 'Sobremesa'].includes(wine.type) && wine.level === 0);
  const drinkStatus = getDrinkStatus(wine);
  const yr = new Date().getFullYear();
  const inWindow = wine.drinkFrom && wine.drinkUntil && yr >= wine.drinkFrom && yr <= wine.drinkUntil;

  return (
    <>
      <motion.div
        layout
        className={`group bg-white rounded-[28px] border border-black/5 shadow-old overflow-hidden flex flex-col transition-all active:scale-[0.98] ${isEmpty ? 'opacity-60' : ''}`}
      >
        {/* Image */}
        <div
          className="relative h-[190px] flex items-center justify-center overflow-hidden bg-cream-dark cursor-zoom-in"
          onClick={() => wine.imageUrl && setShowZoom(true)}
        >
          {wine.imageUrl ? (
            <img
              src={wine.imageUrl}
              alt={wine.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 opacity-20">
              <span className="text-5xl">🍷</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand-wine">{wine.type}</span>
            </div>
          )}

          {wine.imageUrl && (
            <div className="absolute top-3 right-3 p-1.5 bg-black/10 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <Maximize2 size={11} />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent z-10" />

          {/* Image badges */}
          <div className="absolute inset-0 p-3 flex flex-col justify-between pointer-events-none z-10">
            <div className="flex justify-between items-start">
              {wine.vintage ? (
                <span className="bg-white/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[10px] font-bold text-brand-wine shadow-sm">
                  {wine.vintage}
                </span>
              ) : <span />}
              {wine.score != null && (
                <span className="bg-brand-gold px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1 shadow-md">
                  <Star size={9} fill="currentColor" />
                  {wine.score} pts
                </span>
              )}
            </div>

            <div className="flex justify-between items-end">
              <span className="bg-white/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[9px] font-bold text-text-main shadow-sm">
                {wine.type}
              </span>
              {isEmpty ? (
                <span className="bg-black/40 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[9px] font-bold text-white">
                  {['Porto', 'Sobremesa'].includes(wine.type) ? 'Vazia' : 'Consumido'}
                </span>
              ) : inWindow && (
                <span className="bg-emerald-500 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-white shadow-md ring-2 ring-white/20">
                  No ponto
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pt-3 pb-3 flex-1 flex flex-col bg-white relative z-20">
          <h3 className="font-serif italic text-text-main text-[16px] leading-snug min-h-[2.6rem] line-clamp-3 mb-1">
            {wine.name}
          </h3>

          {wine.producer && (
            <p className="text-[12px] text-text-sub truncate opacity-70 mb-0.5">{wine.producer}</p>
          )}

          {(wine.country || wine.grape) && (
            <p className="text-[11px] text-text-muted mb-0.5">
              {wine.country}{wine.country && wine.grape ? ' · ' : ''}{wine.grape}
            </p>
          )}

          {drinkStatus && (
            <p className={`text-[11px] font-medium mt-0.5 ${drinkStatus.color}`}>
              {drinkStatus.icon} {drinkStatus.text}
            </p>
          )}

          <div className="mt-auto pt-2.5 flex items-center justify-between border-t border-black/5">
            <div className="flex items-center gap-1 text-[11px] text-text-muted">
              <Package size={11} className="opacity-50" />
              <span>{wine.qty} un</span>
            </div>
            {adega && (
              <div className="flex items-center gap-1 text-[11px] text-text-muted">
                <span>{adega.emoji}</span>
                <span>{adega.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={`px-2 pb-2 pt-0 grid ${isAdmin ? 'grid-cols-5 gap-1' : 'grid-cols-2 gap-2'}`}>
          {isAdmin ? (
            <>
              <CircularAction icon={<Edit3 size={13} />} color="bg-cream-deep text-text-sub" onClick={() => onEdit?.(wine)} admin />
              <CircularAction icon={<BookOpen size={13} />} color="bg-brand-wine/10 text-brand-wine" onClick={() => onExpert?.(wine)} admin />
              <CircularAction icon={<GlassWater size={13} />} color="bg-brand-wine text-white" onClick={() => onDrink?.(wine)} admin />
              <CircularAction icon={<Package size={13} />} color="bg-cream-deep text-text-sub" onClick={() => onStock?.(wine)} admin />
              <CircularAction icon={<Trash2 size={13} />} color="bg-red-50 text-red-600" onClick={() => onDelete?.(wine)} admin />
            </>
          ) : (
            <>
              <CircularAction icon={<BookOpen size={18} />} label="Análise" color="bg-brand-wine/10 text-brand-wine" onClick={() => onExpert?.(wine)} showLabel />
              <CircularAction icon={<GlassWater size={18} />} label="Beber" color="bg-brand-wine text-white" onClick={() => onDrink?.(wine)} showLabel />
            </>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showZoom && wine.imageUrl && (
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
                src={wine.imageUrl}
                alt={wine.name}
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
              <button
                onClick={(e) => { e.stopPropagation(); setShowZoom(false); }}
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
              >
                <X size={32} />
              </button>
              <div className="absolute -bottom-12 left-0 right-0 text-center text-white/80 font-serif italic text-lg">
                {wine.name}
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
