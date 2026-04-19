import React, { useState } from 'react';
import { Wine, Spirit, Adega } from '../types';
import { X, Package, ArrowRight, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sbPatch, sbUpsert, sbDel } from '../lib/supabase';

interface StockModalProps {
  item: Wine | Spirit;
  mode: 'wines' | 'spirits';
  allItems: (Wine | Spirit)[];
  adegas: Adega[];
  onClose: () => void;
  onRefresh: () => void;
}

export function StockModal({ item, mode, allItems, adegas, onClose, onRefresh }: StockModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Find siblings: same name and producer
  const siblings = allItems.filter(x => 
    x.name.toLowerCase().trim() === item.name.toLowerCase().trim() &&
    (x.producer || '').toLowerCase().trim() === (item.producer || '').toLowerCase().trim()
  );

  const totalQty = siblings.reduce((acc, x) => acc + (x as any).qty, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white border border-slate-200 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Package size={24} />
            </div>
            <div>
              <h3 className="text-xl font-serif italic text-slate-900 leading-tight">{item.name}</h3>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Gestão de Estoque</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Total em Estoque</div>
              <div className="text-2xl font-serif italic text-indigo-700">{totalQty} unidades</div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Localizações</div>
              <div className="text-2xl font-serif italic text-slate-700">{siblings.length} adegas</div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Distribuição por Adega</label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {siblings.map(sib => {
                const adega = adegas.find(a => a.id === sib.adegaId);
                return (
                  <div key={sib.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-300 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{adega?.emoji || '🏠'}</span>
                      <span className="text-sm font-bold text-slate-700">{adega?.name || '—'}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">{(sib as any).qty} un</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
          <button 
            disabled={loading}
            onClick={onClose}
            className="flex-1 py-3 px-6 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-white transition-all shadow-sm"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
