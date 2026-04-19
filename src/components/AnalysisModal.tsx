import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, RefreshCw, Star } from 'lucide-react';
import { Wine, Spirit } from '../types';
import { generateExpertSummaryGemini } from '../lib/ai';

interface AnalysisModalProps {
  item: Wine | Spirit;
  mode: 'wines' | 'spirits';
  onClose: () => void;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
  onUpdateScore?: (item: any, score: number) => Promise<void>;
  isAdmin: boolean;
}

export function AnalysisModal({ item, mode, onClose, onSaveNotes, onUpdateScore, isAdmin }: AnalysisModalProps) {
  const [activeTab, setActiveTab] = useState<'notes' | 'ai'>('notes');
  const [personalNotes, setPersonalNotes] = useState(item.personalNotes || '');
  const [aiSummary, setAiSummary] = useState(item.expertSummary || '');
  const [loadingAi, setLoadingAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingScore, setSavingScore] = useState(false);

  const detectedScore = useMemo(() => {
    if (!aiSummary) return null;
    const match = aiSummary.match(/Nota:\s*(\d{2,3})/i);
    return match ? parseInt(match[1]) : null;
  }, [aiSummary]);

  async function handleSave() {
    if (!isAdmin) return;
    setSaving(true);
    try {
      await onSaveNotes(item.id, personalNotes);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveScore() {
    if (!detectedScore || !onUpdateScore) return;
    setSavingScore(true);
    try {
      await onUpdateScore(item, detectedScore);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingScore(false);
    }
  }

  async function handleGenerateAi() {
    setLoadingAi(true);
    try {
      const text = await generateExpertSummaryGemini(item, mode === 'spirits');
      setAiSummary(text);
    } catch (e) {
      console.error(e);
      setAiSummary('Erro ao gerar análise.');
    } finally {
      setLoadingAi(false);
    }
  }

  const itemEmoji = mode === 'spirits' ? '🥃' : '🍷';

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
        className="relative bg-cream border border-black/15 rounded-[24px] w-full max-w-md overflow-hidden shadow-old-lg flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{itemEmoji}</span>
            <h3 className="text-[22px] font-serif italic text-text-main leading-tight">{item.name}</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-cream-dark border border-black/5 rounded-lg text-text-sub hover:bg-cream-deep transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[13px] font-sans transition-all ${
              activeTab === 'notes' 
                ? 'bg-brand-wine/5 border-brand-wine/30 text-brand-wine shadow-sm' 
                : 'bg-white/50 border-black/5 text-text-sub hover:bg-white'
            }`}
          >
            <span>✏️</span>
            <span>Análise</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[13px] font-sans transition-all ${
              activeTab === 'ai' 
                ? 'bg-brand-wine/5 border-brand-wine/30 text-brand-wine shadow-sm' 
                : 'bg-white/50 border-black/5 text-text-sub hover:bg-white'
            }`}
          >
            <span>{itemEmoji}</span>
            <span>Sommelier IA</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-4">
          {activeTab === 'notes' ? (
            <textarea
              value={personalNotes}
              onChange={(e) => setPersonalNotes(e.target.value)}
              placeholder={`Suas notas pessoais sobre este ${mode === 'spirits' ? 'spirit' : 'vinho'}...`}
              className="w-full h-[200px] p-4 bg-white border border-black/10 rounded-xl text-[14px] text-text-main focus:outline-none focus:border-brand-wine/30 transition-all resize-none font-sans placeholder:text-text-muted/60"
            />
          ) : (
            <div className="space-y-4">
              <div className="h-[200px] overflow-y-auto p-4 bg-white border border-black/10 rounded-xl text-[13px] leading-relaxed text-text-sub font-sans">
                {loadingAi ? (
                   <div className="h-full flex flex-col items-center justify-center gap-2 opacity-40">
                     <RefreshCw size={24} className="animate-spin" />
                     <p className="text-[10px] uppercase tracking-widest font-bold">Consultando IA...</p>
                   </div>
                ) : aiSummary ? (
                  <div className="space-y-3">
                    {aiSummary.split('\n').map((para, i) => para.trim() ? (
                      <p key={i}>{para.replace(/\*\*/g, '')}</p>
                    ) : null)}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3">
                     <p className="text-center opacity-60">Nenhuma análise gerada ainda.</p>
                     {isAdmin && (
                      <button 
                        onClick={handleGenerateAi}
                        className="px-4 py-2 bg-brand-wine/10 text-brand-wine rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-brand-wine/20 transition-all"
                      >
                        Gerar Análise
                      </button>
                     )}
                  </div>
                )}
              </div>

              {detectedScore && isAdmin && item.score !== detectedScore && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-brand-gold/5 border border-brand-gold/20 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-gold text-white flex items-center justify-center font-serif italic text-sm shadow-sm">
                      {detectedScore}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-text-main leading-none">Nota Detectada</p>
                      <p className="text-[9px] text-text-sub">Aplicar este score?</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleSaveScore}
                    disabled={savingScore}
                    className="px-3 py-1.5 bg-brand-gold text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {savingScore ? <RefreshCw size={10} className="animate-spin" /> : <Star size={10} fill="currentColor" />}
                    <span>Aplicar</span>
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {isAdmin && activeTab === 'notes' && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3.5 bg-brand-wine text-white rounded-xl text-[15px] font-sans font-medium flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md"
              >
                {saving ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                <span>Salvar</span>
              </button>
            )}
            {isAdmin && activeTab === 'ai' && (
              <button
                onClick={handleGenerateAi}
                disabled={loadingAi}
                className="w-full py-3.5 bg-white border border-brand-wine/30 text-brand-wine rounded-xl text-[15px] font-sans font-medium flex items-center justify-center gap-2 hover:bg-brand-wine/5 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm"
              >
                <RefreshCw size={18} className={loadingAi ? 'animate-spin' : ''} />
                <span>Regerar Análise</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-white border border-black/10 text-text-main rounded-xl text-[15px] font-sans font-medium flex items-center justify-center gap-2 hover:bg-cream-dark active:scale-[0.98] transition-all"
            >
              <span>Fechar</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
