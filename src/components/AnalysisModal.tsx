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
  onSaveExpertSummary?: (id: string, summary: string) => Promise<void>;
  onUpdateScore?: (item: any, score: number) => Promise<void>;
  isAdmin: boolean;
}

export function AnalysisModal({ item, mode, onClose, onSaveNotes, onSaveExpertSummary, onUpdateScore, isAdmin }: AnalysisModalProps) {
  const [activeTab, setActiveTab] = useState<'notes' | 'ai'>('ai');
  const [personalNotes, setPersonalNotes] = useState(item.personalNotes || '');
  const [aiSummary, setAiSummary] = useState(item.expertSummary || '');
  const [loadingAi, setLoadingAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
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

  async function handleSaveExpert() {
    if (!isAdmin || !onSaveExpertSummary) return;
    setSavingAi(true);
    try {
      await onSaveExpertSummary(item.id, aiSummary);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingAi(false);
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

  // AI Summary Formatter
  const renderAiSummary = (text: string) => {
    const lines = text.split('\n');
    const sections = ['Harmonizações', 'Perfil Sensorial', 'Produção', 'Pontuações', 'Variedade', 'Região', 'Notas Técnicas', 'Aroma', 'Paladar', 'Finalização'];
    
    return lines.map((para, i) => {
      const trimmed = para.trim().replace(/\*\*/g, '');
      if (!trimmed) return <div key={i} className="h-2" />;

      // Check if it's a heading
      const isHeading = sections.some(s => trimmed.toLowerCase().startsWith(s.toLowerCase()));
      
      if (isHeading) {
        return (
          <p key={i} className="text-brand-wine font-serif italic text-base mt-4 mb-1">
            {trimmed}
          </p>
        );
      }

      return (
        <p key={i} className="text-text-sub text-[15px] leading-relaxed mb-3">
          {trimmed}
        </p>
      );
    });
  };

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
        className="relative bg-cream border border-black/15 rounded-[32px] w-full max-w-lg max-h-[90vh] overflow-hidden shadow-old-lg flex flex-col"
      >
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{itemEmoji}</span>
            <h3 className="text-[24px] font-serif italic text-text-main leading-tight">{item.name}</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-cream-dark border border-black/5 rounded-xl text-text-sub hover:bg-cream-deep transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-8 grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-[14px] font-sans transition-all ${
              activeTab === 'notes' 
                ? 'bg-white border-brand-wine/20 text-brand-wine shadow-md' 
                : 'bg-white/40 border-black/5 text-text-muted hover:bg-white'
            }`}
          >
            <span className="opacity-70">✏️</span>
            <span className="font-medium">Análise</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-[14px] font-sans transition-all ${
              activeTab === 'ai' 
                ? 'bg-white border-brand-wine/20 text-brand-wine shadow-md' 
                : 'bg-white/40 border-black/5 text-text-muted hover:bg-white'
            }`}
          >
            <span className="opacity-70">{itemEmoji}</span>
            <span className="font-medium">Sommelier IA</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-8 pb-8 flex-1 overflow-y-auto min-h-0">
          <div className="bg-white/60 border border-black/5 rounded-[24px] p-6 shadow-sm min-h-[300px]">
            {activeTab === 'notes' ? (
              <textarea
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                placeholder={`Suas notas pessoais sobre este ${mode === 'spirits' ? 'spirit' : 'vinho'}...`}
                className="w-full h-[350px] p-0 bg-transparent text-[15px] leading-relaxed text-text-main focus:outline-none transition-all resize-none font-sans placeholder:text-text-muted/60"
              />
            ) : (
              <div className="space-y-4">
                {loadingAi ? (
                   <div className="h-[350px] flex flex-col items-center justify-center gap-2 opacity-40">
                     <RefreshCw size={32} className="animate-spin text-brand-wine" />
                     <p className="text-[11px] uppercase tracking-widest font-bold text-brand-wine">Consultando IA...</p>
                   </div>
                ) : aiSummary ? (
                  <div className="font-sans">
                    {renderAiSummary(aiSummary)}
                  </div>
                ) : (
                  <div className="h-[350px] flex flex-col items-center justify-center gap-4">
                     <p className="text-center opacity-60 font-serif italic text-lg">Nenhuma análise gerada ainda.</p>
                     {isAdmin && (
                      <button 
                        onClick={handleGenerateAi}
                        className="px-6 py-2.5 bg-brand-wine/10 text-brand-wine rounded-xl text-[13px] font-bold uppercase tracking-widest hover:bg-brand-wine/20 transition-all border border-brand-wine/20"
                      >
                        Gerar Análise
                      </button>
                     )}
                  </div>
                )}
              </div>
            )}
          </div>

          {activeTab === 'ai' && detectedScore && isAdmin && item.score !== detectedScore && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-brand-gold/5 border border-brand-gold/20 rounded-2xl flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-gold text-white flex items-center justify-center font-serif italic text-lg shadow-sm">
                  {detectedScore}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-text-main leading-none mb-1">Nota Detectada</p>
                  <p className="text-[11px] text-text-sub">Atualizar o score oficial?</p>
                </div>
              </div>
              <button 
                onClick={handleSaveScore}
                disabled={savingScore}
                className="px-4 py-2 bg-brand-gold text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {savingScore ? <RefreshCw size={12} className="animate-spin" /> : <Star size={12} fill="currentColor" />}
                <span>Aplicar</span>
              </button>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-6">
            {activeTab === 'notes' ? (
              <>
                {isAdmin && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-4 bg-brand-wine text-white rounded-2xl text-[16px] font-sans font-medium flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md"
                  >
                    {saving ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />}
                    <span>Salvar</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-white border border-black/10 text-text-main rounded-2xl text-[16px] font-sans font-medium flex items-center justify-center gap-2 hover:bg-cream-dark active:scale-[0.98] transition-all shadow-sm"
                >
                  <span>Fechar</span>
                </button>
              </>
            ) : (
              <>
                {isAdmin && aiSummary && (
                  <button
                    onClick={handleSaveExpert}
                    disabled={savingAi}
                    className="w-full py-4 bg-brand-wine text-white rounded-2xl text-[16px] font-sans font-medium flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md"
                  >
                    {savingAi ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />}
                    <span>Salvar análise</span>
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={handleGenerateAi}
                    disabled={loadingAi}
                    className="w-full py-4 bg-white border border-black/10 text-text-sub rounded-2xl text-[16px] font-sans font-medium flex items-center justify-center gap-2 hover:bg-cream-dark active:scale-[0.98] transition-all shadow-sm"
                  >
                    <RefreshCw size={18} className={loadingAi ? 'animate-spin' : ''} />
                    <span>Novo</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-white border border-black/10 text-text-sub rounded-2xl text-[16px] font-sans font-medium flex items-center justify-center gap-2 hover:bg-cream-dark active:scale-[0.98] transition-all shadow-sm"
                >
                  <span>Fechar</span>
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
