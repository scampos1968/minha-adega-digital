import { useState, useEffect, useRef } from 'react';
import { ModalShell } from './ModalShell';
import { Mic, MicOff, Search, Sparkles, Trophy, ChefHat, PartyPopper, Heart } from 'lucide-react';
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
    // Check for standard web speech API
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
  }, [isListening]);

  return (
    <ModalShell 
      title="Busca por Voz Inteligente" 
      onClose={onClose}
      icon={<Mic size={20} className="text-indigo-600" />}
      maxWidth="max-w-xl"
    >
      <div className="space-y-8 py-4">
        {/* Visual Pulse */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <AnimatePresence>
              {isListening && (
                <>
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 bg-indigo-600/20 rounded-full"
                  />
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
                    className="absolute inset-0 bg-indigo-600/10 rounded-full"
                  />
                </>
              )}
            </AnimatePresence>
            <button
              onClick={toggleListening}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl ${
                isListening ? 'bg-indigo-600 text-white scale-110' : 'bg-white border border-slate-200 text-slate-400 hover:border-indigo-400'
              }`}
            >
              {isListening ? <Mic size={40} /> : <MicOff size={40} />}
            </button>
          </div>
          <p className="text-xs font-bold uppercase tracking-[3px] text-slate-400">
            {isListening ? 'Escutando...' : 'Toque para falar'}
          </p>
        </div>

        {/* Transcript Box */}
        <div className={`p-6 rounded-2xl border transition-all duration-500 ${transcript ? 'bg-white border-indigo-200 shadow-lg' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
          <div className="flex items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-indigo-600">
            <Sparkles size={12} />
            <span>Sua solicitação</span>
          </div>
          <p className="text-lg font-bold text-slate-800 leading-relaxed min-h-[3rem]">
            {transcript || 'Ex: "Sugira um vinho tinto encorpado para um churrasco de domingo"'}
          </p>
        </div>

        {/* Processing State */}
        {isProcessing && (
          <div className="flex flex-col items-center gap-4 py-8">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="text-indigo-600"
            >
              <RefreshCw size={32} />
            </motion.div>
            <p className="font-bold text-slate-400 text-sm uppercase tracking-widest">Interpretando sua adega...</p>
          </div>
        )}

        {/* Errors */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-50 p-4 rounded-xl flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                      {result.contexto?.ocasiao?.includes('rom') ? <Heart size={16} /> : result.contexto?.ocasiao?.includes('fest') ? <PartyPopper size={16} /> : <ChefHat size={16} />}
                   </div>
                   <div>
                     <p className="text-[10px] font-bold uppercase text-slate-400">Contexto Interpretado</p>
                     <p className="text-xs font-bold text-slate-700">{result.contexto?.pedido_interpretado}</p>
                   </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Trophy size={14} className="text-amber-500" />
                  Sugestões da IA
                </h4>
                <div className="space-y-2">
                  {result.ranking?.map((rank: any, i: number) => {
                    const item = inventory.find(inv => inv.id === rank.id);
                    return (
                      <motion.button
                        key={rank.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => item && onSelectItem(item)}
                        className="w-full bg-white hover:bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-4 text-left transition-all group shadow-sm hover:shadow-md"
                      >
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-inner">
                          {rank.posicao}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-slate-800 truncate">{rank.nome}</h5>
                          <p className="text-[11px] text-slate-500 leading-snug line-clamp-2 mt-1 font-medium">{rank.motivo}</p>
                        </div>
                        <div className="text-xs font-bold text-amber-500 px-2 py-1 bg-amber-50 rounded-lg">
                          {rank.pontuacao_total}pts
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
    </ModalShell>
  );
}

function RefreshCw({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}
