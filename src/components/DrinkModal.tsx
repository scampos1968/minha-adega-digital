import React, { useState } from 'react';
import { Wine, Spirit, Consumption, SpiritConsumption } from '../types';
import { ModalShell } from './ModalShell';
import { Star, MessageSquareCode, GlassWater, Sparkles, Check, X, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

interface DrinkModalProps {
  item: Wine | Spirit;
  mode: 'wines' | 'spirits';
  isAdmin: boolean;
  onClose: () => void;
  onSave: (consumptionData: any) => Promise<void>;
}

export function DrinkModal({ item, mode, isAdmin, onClose, onSave }: DrinkModalProps) {
  const isWine = mode === 'wines';
  const wine = item as Wine;
  
  // For wines that aren't Porto/Sobremesa, it's always full bottle (qty - 1)
  // For Porto/Sobremesa and Spirits, it's a level change
  const isPartial = !isWine || ['Porto', 'Sobremesa', 'Laranja'].includes(wine.type);
  
  const [level, setLevel] = useState(item.level ?? 100);
  const [score, setScore] = useState(item.score || 0);
  const [notes, setNotes] = useState('');
  const [occasion, setOccasion] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!isAdmin) {
      if (password.toLowerCase().trim() !== 'membeca') {
        alert('Senha de degustação incorreta.');
        return;
      }
    }
    setLoading(true);
    try {
      const consumption = {
        itemId: item.id,
        levelBefore: item.level || 100,
        levelAfter: isPartial ? level : 0,
        qty: isPartial ? 0 : 1, // decrement 1 if full consume
        score,
        notes,
        occasion,
        date: new Date().toISOString()
      };
      await onSave(consumption);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar consumo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell 
      title={`Degustar: ${item.name}`} 
      onClose={onClose}
      icon={<GlassWater size={22} className="text-brand-wine" />}
      footer={
        <>
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-white border border-black/10 rounded-2xl text-[15px] font-sans font-medium text-text-sub hover:bg-cream-dark active:scale-[0.98] transition-all"
          >
            Fechar
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-4 bg-brand-wine text-white rounded-2xl text-[15px] font-sans font-medium flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
            <span>Registrar</span>
          </button>
        </>
      }
    >
      <div className="space-y-7 py-2">
        {/* Level Control */}
        {isPartial && (
          <div className="bg-white/60 border border-black/5 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-brand-gold" />
                <span className="text-[13px] font-bold text-text-muted uppercase tracking-wider">Nível Restante</span>
              </div>
              <span className="text-2xl font-serif italic text-brand-wine">{level}%</span>
            </div>
            <div className="relative pt-2 pb-6">
              <input 
                type="range" 
                min="0" 
                max={item.level || 100} 
                value={level} 
                onChange={(e) => setLevel(parseInt(e.target.value))}
                className="w-full h-1.5 bg-cream-deep rounded-full appearance-none cursor-pointer accent-brand-wine"
              />
              <div className="flex justify-between mt-3 px-1">
                {[0, 25, 50, 75, 100].map(p => (
                  <div key={p} className="flex flex-col items-center">
                    <div className="w-[1px] h-2 bg-black/10" />
                    <span className="text-[9px] text-text-muted font-bold mt-1">{p}%</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-text-sub leading-relaxed italic opacity-80">
              O nível atual é {item.level || 100}%. Arraste o seletor para registrar quanto restou na garrafa.
            </p>
          </div>
        )}

        {/* Score & Occasion */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest ml-1">Sua Avaliação</label>
            <div className="flex gap-1.5 justify-between">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setScore(s)}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                    score >= s ? 'text-brand-gold scale-110 drop-shadow-sm' : 'text-cream-deep hover:text-brand-gold/40'
                  }`}
                >
                  <Star size={24} fill={score >= s ? 'currentColor' : 'none'} strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest ml-1">Ocasião</label>
            <div className="flex flex-wrap gap-2">
              {['Jantar', 'Degustação', 'Vila', 'Presente'].map(occ => (
                <button
                  key={occ}
                  onClick={() => setOccasion(occ)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                    occasion === occ 
                      ? 'bg-brand-gold text-white border-brand-gold shadow-sm' 
                      : 'bg-white border-black/5 text-text-sub hover:bg-cream-dark'
                  }`}
                >
                  {occ}
                </button>
              ))}
            </div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Ou digite..." 
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full bg-white border border-black/10 rounded-xl py-2.5 px-4 text-base sm:text-[13px] focus:outline-none focus:border-brand-wine/20 transition-all font-sans italic"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-3">
          <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest ml-1">Notas de Degustação</label>
          <div className="relative">
            <textarea 
              rows={3} 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva os aromas, taninos, finalização..."
              className="w-full bg-white border border-black/10 rounded-2xl py-4 px-5 text-base sm:text-[14px] leading-relaxed focus:outline-none focus:border-brand-wine/20 transition-all resize-none shadow-inner italic font-serif"
            />
            <MessageSquareCode size={14} className="absolute top-4 right-4 text-brand-wine/30" />
          </div>
        </div>

        {!isAdmin && (
          <div className="p-5 bg-brand-wine/5 rounded-3xl border border-brand-wine/10 mt-4">
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-brand-wine text-center mb-3 opacity-60">Status de Visitante</p>
            <div className="flex flex-col items-center gap-3">
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Código de Autorização"
                className="w-full max-w-[200px] bg-white border border-brand-wine/20 rounded-xl py-2.5 px-4 text-center font-mono tracking-[4px] outline-none text-base sm:text-sm placeholder:tracking-normal placeholder:font-sans placeholder:text-[11px]"
              />
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function RefreshCw({ className, size }: any) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
    >
      <GlassWater size={size} className={className} />
    </motion.div>
  );
}
