import { useState } from 'react';
import { Wine, Spirit, Consumption, SpiritConsumption } from '../types';
import { ModalShell } from './ModalShell';
import { Star, MessageSquareCode, GlassWater, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface DrinkModalProps {
  item: Wine | Spirit;
  mode: 'wines' | 'spirits';
  onClose: () => void;
  onSave: (consumptionData: any) => Promise<void>;
}

export function DrinkModal({ item, mode, onClose, onSave }: DrinkModalProps) {
  const isWine = mode === 'wines';
  const wine = item as Wine;
  const spirit = item as Spirit;

  // For wines that aren't Porto/Sobremesa, it's always full bottle (qty - 1)
  // For Porto/Sobremesa and Spirits, it's a level change
  const isPartial = !isWine || ['Porto', 'Sobremesa'].includes(wine.type);
  
  const [level, setLevel] = useState(item.level ?? 100);
  const [score, setScore] = useState(item.score || 0);
  const [notes, setNotes] = useState('');
  const [occasion, setOccasion] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
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
      icon={<GlassWater size={20} className="text-wine" />}
      footer={
        <>
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-6 bg-white border border-parchment/60 rounded-xl text-xs font-bold uppercase tracking-widest text-text-sub hover:bg-cream2 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 px-6 bg-wine text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Sparkles className="animate-pulse" size={14} /> : 'Registrar'}
          </button>
        </>
      }
    >
      <div className="space-y-8">
        {/* Level Control if partial */}
        {isPartial && (
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Nível Restante</label>
              <span className="text-2xl font-serif italic text-wine">{level}%</span>
            </div>
            <div className="relative h-12 flex items-center">
              <input 
                type="range" 
                min="0" 
                max={item.level || 100} 
                value={level} 
                onChange={(e) => setLevel(parseInt(e.target.value))}
                className="w-full h-2 bg-cream2 rounded-lg appearance-none cursor-pointer accent-wine"
              />
              <div className="absolute top-0 left-0 h-full w-full pointer-events-none flex justify-between px-1">
                <div className="w-[1px] h-3 bg-parchment/30 mt-1" />
                <div className="w-[1px] h-3 bg-parchment/30 mt-1" />
                <div className="w-[1px] h-3 bg-parchment/30 mt-1" />
                <div className="w-[1px] h-3 bg-parchment/30 mt-1" />
                <div className="w-[1px] h-3 bg-parchment/30 mt-1" />
              </div>
            </div>
            <p className="text-[10px] text-text-sub flex items-center gap-1.5 italic">
              <Sparkles size={10} />
              O nível atual da garrafa é {item.level || 100}%. Deslize para registrar quanto restou.
            </p>
          </div>
        )}

        {/* Score */}
        <div className="space-y-4">
          <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Sua Avaliação</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setScore(s)}
                className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${
                  score >= s 
                    ? 'bg-gold border-gold text-white shadow-md scale-105' 
                    : 'bg-white border-parchment/40 text-text-muted hover:border-gold/40'
                }`}
              >
                <Star size={20} fill={score >= s ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
        </div>

        {/* Occasion */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Ocasião</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['Jantar', 'Degustação', 'Presente', 'Festa'].map(occ => (
              <button
                key={occ}
                onClick={() => setOccasion(occ)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  occasion === occ 
                    ? 'bg-wine/10 border-wine text-wine' 
                    : 'bg-white border-parchment/20 text-text-sub hover:bg-cream2'
                }`}
              >
                {occ}
              </button>
            ))}
          </div>
          <input 
            type="text" 
            placeholder="Ou digite outra ocasião..." 
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            className="w-full bg-white border border-parchment/20 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-wine/10 focus:border-wine outline-none transition-all"
          />
        </div>

        {/* Notes */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-text-muted">
            <MessageSquareCode size={16} />
            <label className="text-sm font-bold uppercase tracking-wider">Notas de Degustação</label>
          </div>
          <textarea 
            rows={4} 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Descreva as sensações, aromas e com que harmonizou..."
            className="w-full bg-white border border-parchment/20 rounded-2xl py-4 px-5 text-sm focus:ring-2 focus:ring-wine/10 focus:border-wine outline-none transition-all resize-none"
          />
        </div>
      </div>
    </ModalShell>
  );
}
