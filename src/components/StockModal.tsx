import React, { useState } from 'react';
import { Wine, Spirit, Adega } from '../types';
import { X, Package, Plus, Minus, Trash2, ArrowRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sbPatch, sbUpsert, sbDel, wineToDB, spiritToDB } from '../lib/supabase';

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
  const [activeAction, setActiveAction] = useState<{type: 'add' | 'move', fromSib?: any, qty: number, targetAdegaId: string} | null>(null);
  
  // Find siblings: same name and producer
  const siblings = allItems.filter(x => 
    x.name.toLowerCase().trim() === item.name.toLowerCase().trim() &&
    (x.producer || '').toLowerCase().trim() === (item.producer || '').toLowerCase().trim()
  );

  const totalQty = siblings.reduce((acc, x) => acc + (x as any).qty, 0);

  async function executeAction() {
    if (!activeAction || !isAdmin) return;
    setLoading('action');
    try {
      const { type, fromSib, qty, targetAdegaId } = activeAction;
      const updatePayloads = [];
      const table = mode === 'spirits' ? 'spirits' : 'wines';

      if (type === 'move' && fromSib) {
        // 1. Reduce from source
        updatePayloads.push(sbPatch(table, fromSib.id, { qty: Math.max(0, fromSib.qty - qty) }));
        
        // 2. Add to target
        let targetSib = siblings.find(s => s.adegaId === targetAdegaId);
        if (targetSib) {
          updatePayloads.push(sbPatch(table, targetSib.id, { qty: (targetSib as any).qty + qty }));
        } else {
          const newRecord = { ...fromSib, id: crypto.randomUUID(), adegaId: targetAdegaId, qty: qty };
          delete (newRecord as any).expertSummary;
          delete (newRecord as any).personalNotes;
          const dbRecord = mode === 'spirits' ? spiritToDB(newRecord) : wineToDB(newRecord);
          updatePayloads.push(sbUpsert(table, dbRecord));
        }
      } else if (type === 'add') {
        const targetSib = siblings.find(s => s.adegaId === targetAdegaId);
        if (targetSib) {
          updatePayloads.push(sbPatch(table, targetSib.id, { qty: (targetSib as any).qty + qty }));
        } else {
          // If no siblings exist at all, we use the 'item' passed to the modal
          const source = siblings[0] || item;
          const newRecord = { ...source, id: crypto.randomUUID(), adegaId: targetAdegaId, qty: qty };
          delete (newRecord as any).expertSummary;
          delete (newRecord as any).personalNotes;
          const dbRecord = mode === 'spirits' ? spiritToDB(newRecord as any) : wineToDB(newRecord as any);
          updatePayloads.push(sbUpsert(table, dbRecord));
        }
      }

      await Promise.all(updatePayloads);
      onRefresh();
      setActiveAction(null);
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
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 15 }}
        className="relative bg-[#faf7f2] border border-black/10 rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Sub-Modal Overlay (Action Dialog) */}
        <AnimatePresence>
          {activeAction && (
            <motion.div 
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="absolute inset-0 z-[200] bg-white p-8 flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-serif font-bold text-text-main flex items-center gap-2">
                    {activeAction.type === 'add' ? '✨ Adicionar Estoque' : '🔄 Mover Estoque'}
                  </h3>
                  {activeAction.type === 'move' && (
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      De: {adegas.find(a => a.id === activeAction.fromSib.adegaId)?.name}
                    </p>
                  )}
                </div>
                <button onClick={() => setActiveAction(null)} className="p-2 bg-cream-dark rounded-full">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6 flex-1">
                {/* Quantity */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest pl-1">Quantidade</label>
                  <div className="flex items-center gap-4 bg-cream-dark p-2 rounded-2xl border border-black/5 justify-between">
                    <button 
                      onClick={() => setActiveAction(prev => prev ? {...prev, qty: Math.max(1, prev.qty - 1)} : null)}
                      className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-white/50 active:scale-95 transition-all text-brand-wine"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="text-2xl font-serif italic font-bold text-text-main">{activeAction.qty}</span>
                    <button 
                      onClick={() => setActiveAction(prev => {
                        if (!prev) return null;
                        const max = prev.type === 'move' ? prev.fromSib.qty : 999;
                        return {...prev, qty: Math.min(max, prev.qty + 1)};
                      })}
                      className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-white/50 active:scale-95 transition-all text-brand-wine"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* Target Adega */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest pl-1">Selecionar Adega {activeAction.type === 'move' ? 'de Destino' : ''}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {adegas
                      .filter(a => activeAction.type === 'add' || a.id !== activeAction.fromSib?.adegaId)
                      .map(a => (
                      <button 
                        key={a.id}
                        onClick={() => setActiveAction(prev => prev ? {...prev, targetAdegaId: a.id} : null)}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                          activeAction.targetAdegaId === a.id 
                            ? 'bg-brand-wine border-brand-wine text-white shadow-md scale-[1.02]' 
                            : 'bg-white border-black/5 text-text-sub hover:bg-cream'
                        }`}
                      >
                        <span className="text-[13px] font-bold">{a.name}</span>
                        <span className={`text-xl transition-transform group-hover:scale-110 ${activeAction.targetAdegaId === a.id ? 'opacity-100' : 'opacity-60'}`}>
                          {a.emoji}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                disabled={!activeAction.targetAdegaId || loading === 'action'}
                onClick={executeAction}
                className="w-full py-5 bg-brand-wine text-white rounded-[22px] font-bold text-sm shadow-xl shadow-brand-wine/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
              >
                {loading === 'action' ? <RefreshCw size={18} className="animate-spin" /> : 'Confirmar Alteração'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <h2 className="text-xl sm:text-2xl font-serif text-text-main font-bold">{item.name}</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-cream-dark/50 border border-black/5 rounded-full text-text-sub hover:bg-cream-deep transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="px-8 pb-8 space-y-8">
          {/* Item Preview Card */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white border border-black/10 rounded-2xl overflow-hidden shadow-sm shrink-0">
               {item.imageUrl ? (
                 <img src={item.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-brand-wine/10 bg-cream">
                   <Package size={28} />
                 </div>
               )}
            </div>
            <div>
               <h3 className="text-[17px] font-serif italic text-text-main leading-tight font-bold">{item.name}</h3>
               <p className="text-[11px] text-text-muted mt-1 font-bold uppercase tracking-wider opacity-70">
                 {item.producer} · {item.country} · {item.type}
               </p>
            </div>
          </div>

          {/* Status and Initial Add (only if empty) */}
          <div className="flex items-center justify-between">
            <div className="bg-[#f0f4ff] border border-[#e0e7ff] text-[#4f46e5] px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-sm">
               <span className="text-sm">🔒</span>
               {totalQty} {totalQty === 1 ? 'fechada' : 'fechadas'}
            </div>

            {siblings.length === 0 && (
              <button 
                onClick={() => setActiveAction({ type: 'add', qty: 1, targetAdegaId: adegas[0]?.id || '' })}
                className="px-5 py-2.5 bg-brand-wine text-white rounded-2xl text-[11px] font-bold shadow-md shadow-brand-wine/10 hover:brightness-110 transition-all flex items-center gap-2"
              >
                <Plus size={14} /> Novo Estoque
              </button>
            )}
          </div>

          {/* Stock Section */}
          <div className="space-y-4">
            {siblings.length > 0 && (
              <h4 className="text-[10px] font-black text-[#8a6040] uppercase tracking-[0.25em] pl-1">Localização Atual</h4>
            )}
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
              {siblings.map(sib => {
                const adega = adegas.find(a => a.id === sib.adegaId);
                const isItemLoading = loading === sib.id;
                
                return (
                  <div key={sib.id} className="bg-white border border-black/5 rounded-[22px] p-2.5 pl-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <span className="text-xl">{adega?.emoji || '🏠'}</span>
                      <span className="text-[14px] font-bold text-text-main">{adega?.name}</span>
                    </div>

                    <div className="flex items-center gap-2 pr-1">
                      <div className="flex items-center gap-1.5 px-4 py-2 group">
                        <span className="text-brand-gold text-sm opacity-50">🔒</span>
                        <span className="text-[14px] font-bold text-[#4a5568]">{(sib as any).qty} un.</span>
                      </div>
                      
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                           <button 
                             type="button"
                             disabled={isItemLoading}
                             onClick={(e) => {
                               e.stopPropagation();
                               setActiveAction({ type: 'move', fromSib: sib, qty: 1, targetAdegaId: '' });
                             }}
                             className="px-4 py-2.5 bg-[#f4f1ea] border border-black/5 rounded-xl text-[11px] font-bold text-text-sub hover:bg-cream-deep active:scale-95 transition-all flex items-center gap-1.5"
                           >
                             <ArrowRight size={14} /> Mover
                           </button>

                           <button 
                             type="button"
                             disabled={isItemLoading}
                             onClick={(e) => {
                               e.stopPropagation();
                               setActiveAction({ type: 'add', qty: 1, targetAdegaId: sib.adegaId });
                             }}
                             className="px-4 py-2.5 bg-brand-wine/5 border border-brand-wine/10 rounded-xl text-[11px] font-bold text-brand-wine hover:bg-brand-wine/10 active:scale-95 transition-all flex items-center gap-1.5"
                           >
                             <Plus size={14} /> Add
                           </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {siblings.length === 0 && (
                <div className="text-center py-8 bg-white/50 border border-dashed border-black/10 rounded-[22px]">
                  <p className="text-[11px] text-text-muted italic">Sem garrafas em estoque</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2">
             <button 
              onClick={onClose}
              className="w-full py-4 bg-[#f4ece0] border border-black/5 rounded-[22px] text-sm font-bold text-text-main hover:bg-[#e8dfd2] active:scale-[0.99] transition-all shadow-sm"
             >
                Fechar
             </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}