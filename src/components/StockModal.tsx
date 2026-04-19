import React, { useState } from 'react';
import { Wine, Spirit, Adega } from '../types';
import { X, Package, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sbPatch, sbUpsert, sbDel } from '../lib/supabase';

interface StockModalProps {
  item: Wine | Spirit;
  mode: 'wines' | 'spirits';
  allItems: (Wine | Spirit)[];
  adegas: Adega[];
  isAdmin: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function StockModal({ item, mode, allItems, adegas, isAdmin, onClose, onRefresh }: StockModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  
  // Find siblings: same name and producer
  const siblings = allItems.filter(x => 
    x.name.toLowerCase().trim() === item.name.toLowerCase().trim() &&
    (x.producer || '').toLowerCase().trim() === (item.producer || '').toLowerCase().trim()
  );

  const totalQty = siblings.reduce((acc, x) => acc + (x as any).qty, 0);

  async function handleUpdateQty(sib: any, delta: number) {
    if (!isAdmin) return;
    const newQty = sib.qty + delta;
    if (newQty < 0) return;
    
    setLoading(sib.id);
    try {
      await sbPatch(mode === 'spirits' ? 'spirits' : 'wines', sib.id, { qty: newQty });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(sib: any) {
    if (!isAdmin || !confirm('Deseja remover este registro de estoque?')) return;
    setLoading(sib.id);
    try {
      await sbDel(mode === 'spirits' ? 'spirits' : 'wines', sib.id);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-cream border border-black/15 rounded-[32px] w-full max-w-lg overflow-hidden shadow-old-lg flex flex-col"
      >
        <div className="px-8 py-6 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white border border-black/5 rounded-2xl flex items-center justify-center text-brand-wine shadow-sm">
              <Package size={24} />
            </div>
            <div>
              <h3 className="text-xl font-serif italic text-text-main leading-tight">{item.name}</h3>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">Gestão de Estoque</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-cream-dark border border-black/5 rounded-xl text-text-sub hover:bg-cream-deep transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-white border border-black/5 rounded-[24px] shadow-sm">
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 opacity-60 text-center">Total Estoque</div>
              <div className="text-2xl font-serif italic text-brand-wine text-center">{totalQty} <span className="text-xs uppercase font-sans font-bold not-italic">un</span></div>
            </div>
            <div className="p-5 bg-white border border-black/5 rounded-[24px] shadow-sm">
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 opacity-60 text-center">Localizações</div>
              <div className="text-2xl font-serif italic text-brand-wine text-center">{siblings.length} <span className="text-xs uppercase font-sans font-bold not-italic">adegas</span></div>
            </div>
          </div>

          {/* List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Distribuição por Adega</label>
              {isAdmin && (
                <button className="text-[10px] font-bold text-brand-wine uppercase tracking-widest hover:underline flex items-center gap-1.5">
                  <Plus size={12} />
                  Adicionar Adega
                </button>
              )}
            </div>
            
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {siblings.map(sib => {
                const adega = adegas.find(a => a.id === sib.adegaId);
                const isItemLoading = loading === sib.id;
                
                return (
                  <motion.div 
                    layout
                    key={sib.id} 
                    className="flex items-center justify-between p-4 bg-white border border-black/5 rounded-[24px] shadow-sm group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center text-xl shadow-inner border border-black/5">
                        {adega?.emoji || '🏠'}
                      </div>
                      <div>
                        <span className="text-[14px] font-bold text-text-main block">{adega?.name || 'Local Indefinido'}</span>
                        <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Prateleira: —</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isAdmin && (
                        <div className="flex items-center bg-cream-dark/50 rounded-xl p-1 border border-black/5">
                          <button 
                            disabled={isItemLoading || (sib as any).qty <= 0}
                            onClick={() => handleUpdateQty(sib, -1)}
                            className="w-8 h-8 flex items-center justify-center text-text-sub hover:text-brand-wine transition-colors disabled:opacity-30"
                          >
                            <Minus size={14} />
                          </button>
                          <div className="w-10 text-center text-sm font-black text-brand-wine font-serif italic">
                            {(sib as any).qty}
                          </div>
                          <button 
                            disabled={isItemLoading}
                            onClick={() => handleUpdateQty(sib, 1)}
                            className="w-8 h-8 flex items-center justify-center text-text-sub hover:text-brand-wine transition-colors disabled:opacity-30"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                      {!isAdmin && (
                        <span className="text-lg font-serif italic text-brand-wine px-3">{(sib as any).qty} <span className="text-[10px] font-sans font-bold uppercase not-italic opacity-40">un</span></span>
                      )}
                      
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(sib)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-8 py-6 bg-cream-dark/30 border-t border-black/5 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-white border border-black/10 rounded-2xl text-[15px] font-sans font-medium text-text-sub hover:bg-cream-dark active:scale-[0.98] transition-all shadow-sm"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
