import { useState, useEffect, useRef } from 'react';
import { X, Mic, RefreshCw, Star, Sparkles, ChefHat, PartyPopper, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { voiceAdegaSearchGemini } from '../lib/ai';

interface VoiceModalProps {
  inventory: any[];
  adegaName: string;
  onClose: () => void;
  onSelectItem: (item: any) => void;
}

export function VoiceModal({ inventory, adegaName, onClose, onSelectItem }: VoiceModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'pt-BR';
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setError('Ocorreu um erro no reconhecimento de voz.');
        setIsListening(false);
      };
    } else {
      setError('Seu navegador não suporta reconhecimento de voz.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setError(null);
      setTranscript('');
      setResult(null);
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSearch = async () => {
    if (!transcript) return;
    setIsProcessing(true);
    setError(null);
    try {
      const aiResult = await voiceAdegaSearchGemini(transcript, inventory, adegaName);
      setResult(aiResult);
    } catch (e) {
      console.error(e);
      setError('Erro ao processar sua busca com IA.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!isListening && transcript && !result && !isProcessing) {
      handleSearch();
    }
  }, [isListening, transcript, result, isProcessing]);

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
        className="relative bg-[#faf7f2] border border-black/15 rounded-[40px] w-full max-w-lg max-h-[90vh] overflow-hidden shadow-old-lg flex flex-col font-sans"
      >
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between border-b border-black/5">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-brand-wine text-white rounded-xl flex items-center justify-center shadow-md">
               <Mic size={20} />
             </div>
             <h3 className="text-[26px] font-serif italic text-text-main leading-none">Busca por Voz</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-cream-dark/50 hover:bg-cream-dark rounded-full transition-colors text-text-sub">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 min-h-0">
          {/* Main Interface */}
          <div className="flex flex-col items-center justify-center space-y-6 pt-4">
            <div className="relative">
              <AnimatePresence>
                {isListening && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-brand-wine/10 rounded-full"
                  />
                )}
              </AnimatePresence>
              <button
                onClick={toggleListening}
                className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border-4 ${
                  isListening 
                    ? 'bg-brand-wine border-brand-wine/20 text-white scale-105' 
                    : 'bg-white border-black/5 text-text-muted hover:border-brand-wine/30'
                }`}
              >
                <Mic size={48} className={isListening ? 'animate-pulse' : ''} />
              </button>
            </div>
            
            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-[4px] text-text-muted">
                {isListening ? 'Escutando...' : 'Toque para falar'}
              </p>
              {!isListening && !transcript && (
                <p className="text-[13px] italic text-text-sub mt-4 max-w-[240px]">
                  "Sugira um tinto leve para harmonizar com massas"
                </p>
              )}
            </div>
          </div>

          {/* Transcript Display */}
          {(transcript || isProcessing) && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-white border border-black/5 rounded-[32px] shadow-sm relative"
            >
              <div className="flex items-center gap-2 mb-3 text-[10px] font-bold uppercase tracking-widest text-brand-gold">
                <Sparkles size={12} fill="currentColor" />
                <span>O que você disse</span>
              </div>
              <p className="text-[15px] font-bold text-text-main leading-relaxed italic">
                {transcript || 'Interpretando comandos...'}
              </p>
              {isProcessing && (
                <div className="absolute right-6 bottom-6">
                  <RefreshCw size={18} className="animate-spin text-brand-gold" />
                </div>
              )}
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm text-center font-bold">
              {error}
            </div>
          )}

          {/* Results Suggestions */}
          <AnimatePresence>
            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 pb-4"
              >
                <div className="bg-cream-dark/40 p-5 rounded-[28px] flex items-center gap-4">
                   <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-brand-wine shadow-sm shrink-0">
                      {result.contexto?.ocasiao?.toLowerCase().includes('rom') ? <Heart size={20} /> : result.contexto?.ocasiao?.toLowerCase().includes('fest') ? <PartyPopper size={20} /> : <ChefHat size={20} />}
                   </div>
                   <div>
                     <p className="text-[10px] font-bold uppercase text-text-muted tracking-widest leading-tight">Insight da IA</p>
                     <p className="text-[13px] font-bold text-text-main mt-0.5">{result.contexto?.pedido_interpretado}</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-sub pl-2">Melhores Sugestões</h4>
                  <div className="grid gap-3">
                    {result.ranking?.map((rank: any, i: number) => {
                      const item = inventory.find(inv => inv.id === rank.id);
                      return (
                        <motion.button
                          key={rank.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          onClick={() => item && onSelectItem(item)}
                          className="w-full bg-white hover:bg-cream-dark/20 border border-black/5 p-4 rounded-[28px] flex items-center gap-4 text-left transition-all group shadow-sm hover:shadow-md"
                        >
                          <div className="w-8 h-8 rounded-full bg-brand-wine text-white flex items-center justify-center font-serif italic font-bold text-sm shadow-inner shrink-0">
                            {rank.posicao}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-text-main truncate text-[14px]">{rank.nome}</h5>
                            <p className="text-[11px] text-text-sub leading-snug line-clamp-2 mt-1 font-medium">{rank.motivo}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <div className="flex items-center gap-1 text-[13px] font-bold text-brand-gold font-serif italic">
                              {rank.pontuacao_total}
                              <Star size={10} fill="currentColor" />
                            </div>
                            <span className="text-[8px] font-bold text-text-muted uppercase tracking-tighter mt-0.5">Matched</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-8 pt-0 flex justify-center">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-white border border-black/5 rounded-[22px] text-[15px] font-semibold text-text-main hover:bg-cream-dark transition-all shadow-sm"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
