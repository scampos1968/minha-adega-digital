import { useState } from 'react';
import { Wine, Spirit, Consumption, SpiritConsumption } from '../types';
import { ModalShell } from './ModalShell';
import { Star, MessageSquareCode, GlassWater, Sparkles } from 'lucide-react';
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
  const spirit = item as Spirit;

  // For wines that aren't Porto/Sobremesa, it's always full bottle (qty - 1)
  // For Porto/Sobremesa and Spirits, it's a level change
  const isPartial = !isWine || ['Porto', 'Sobremesa'].includes(wine.type);
  
  const [level, setLevel] = useState(item.level ?? 100);
  const [score, setScore] = useState(item.score || 0);
  const [notes, setNotes] = useState('');
  const [occasion, setOccasion] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!isAdmin) {
      if (password !== 'membeca') {
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
      icon={<GlassWater size={20} className="text-indigo-600" />}
      footer={
        <>
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-6 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all font-sans"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 px-6 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 font-sans"
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
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Nível Restante</label>
              <span className="text-2xl font-bold text-indigo-600">{level}%</span>
            </div>
            <div className="relative h-12 flex items-center">
              <input 
                type="range" 
                min="0" 
                max={item.level || 100} 
                value={level} 
                onChange={(e) => setLevel(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="absolute top-0 left-0 h-full w-full pointer-events-none flex justify-between px-1">
                <div className="w-[1px] h-3 bg-slate-200 mt-1" />
                <div className="w-[1px] h-3 bg-slate-200 mt-1" />
                <div className="w-[1px] h-3 bg-slate-200 mt-1" />
                <div className="w-[1px] h-3 bg-slate-200 mt-1" />
                <div className="w-[1px] h-3 bg-slate-200 mt-1" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1.5 font-medium">
              <Sparkles size={10} />
              O nível atual da garrafa é {item.level || 100}%. Deslize para registrar quanto restou.
            </p>
          </div>
        )}

        {/* Score */}
        <div className="space-y-4">
          <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Sua Avaliação</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setScore(s)}
                className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${
                  score >= s 
                    ? 'bg-amber-500 border-amber-500 text-white shadow-md scale-105' 
                    : 'bg-white border-slate-200 text-slate-400 hover:border-amber-400/40'
                }`}
              >
                <Star size={20} fill={score >= s ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
        </div>

        {/* Occasion */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Ocasião</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['Jantar', 'Degustação', 'Presente', 'Festa'].map(occ => (
              <button
                key={occ}
                onClick={() => setOccasion(occ)}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                  occasion === occ 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
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
            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        {/* Notes */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-500">
            <MessageSquareCode size={16} />
            <label className="text-sm font-bold uppercase tracking-wider">Notas de Degustação</label>
          </div>
          <textarea 
            rows={4} 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Descreva as sensações, aromas e com que harmonizou..."
            className="w-full bg-white border border-slate-200 rounded-xl py-4 px-5 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none"
          />
        </div>

        {!isAdmin && (
          <div className="space-y-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
            <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 ml-1">Código de Autorização</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Digite o código da casa"
              className="w-full bg-white border border-indigo-200 rounded-xl py-3 px-4 text-center font-mono tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
            />
          </div>
        )}
      </div>
    </ModalShell>
  );
}
