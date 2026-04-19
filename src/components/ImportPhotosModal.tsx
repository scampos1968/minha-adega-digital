import { useState, useRef, ChangeEvent } from 'react';
import { X, ChevronDown, Camera, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Adega } from '../types';
import { analyzeLabelGemini } from '../lib/ai';

interface ImportPhotosModalProps {
  adegas: Adega[];
  activeAdegaId?: string;
  onClose: () => void;
  onResults: (results: { data: any, imageUrl: string }[]) => void;
}

export function ImportPhotosModal({ adegas, activeAdegaId, onClose, onResults }: ImportPhotosModalProps) {
  const [selectedAdegaId, setSelectedAdegaId] = useState(activeAdegaId && activeAdegaId !== 'all' ? activeAdegaId : adegas[0]?.id);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAdega = adegas.find(a => a.id === selectedAdegaId) || adegas[0];

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleIdentify = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    
    try {
      const results: { data: any, imageUrl: string }[] = [];
      
      for (const file of files) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const aiData = await analyzeLabelGemini(base64);
        if (aiData) {
          results.push({ data: aiData, imageUrl: base64 });
        }
      }

      onResults(results);
    } catch (error) {
      console.error('Error processing photos:', error);
      alert('Erro ao processar as fotos com IA.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-[40px] w-full max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col p-8 font-sans"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <h2 className="text-[32px] font-serif font-medium text-[#4a3f35]">Importar por foto</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-[#f2f0eb] hover:bg-[#e8e4db] rounded-xl transition-colors text-[#8c7e6e]"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="space-y-2.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c7e6e] pl-1">ADEGA DE DESTINO</label>
            <div className="relative">
              <select 
                value={selectedAdegaId}
                onChange={(e) => setSelectedAdegaId(e.target.value)}
                className="w-full h-14 bg-white border border-[#e5e1da] rounded-2xl px-5 text-[15px] font-medium text-[#4a3f35] appearance-none focus:outline-none focus:ring-2 focus:ring-[#722f37]/5 transition-all"
              >
                {adegas.map(a => (
                  <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8c7e6e]">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#d1ccc4] bg-[#f9f7f2] rounded-[32px] py-12 flex flex-col items-center justify-center cursor-pointer hover:bg-[#f2f0eb] transition-all group"
          >
            <div className="w-16 h-12 relative flex items-center justify-center mb-4">
               {/* Custom Camera Icon matching the look */}
               <div className="w-14 h-10 bg-[#4a3f35]/80 rounded-md relative flex items-center justify-center shadow-sm">
                  <div className="w-5 h-5 rounded-full border-2 border-white/40" />
                  <div className="absolute top-1 right-2 w-1.5 h-1.5 bg-white/40 rounded-full" />
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-[#4a3f35]/80 rounded-t-sm" />
               </div>
            </div>
            {files.length > 0 ? (
              <p className="text-[14px] font-medium text-[#4a3f35]">{files.length} {files.length === 1 ? 'imagem selecionada' : 'imagens selecionadas'}</p>
            ) : (
              <>
                <p className="text-[14px] font-medium text-[#8c7e6e] mb-1">Clique para selecionar fotos dos rótulos</p>
                <p className="text-[12px] text-[#b3a99d]">Múltiplas imagens de uma vez</p>
              </>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 space-y-3">
          <button 
            onClick={onClose}
            className="w-full h-14 bg-white border border-[#e5e1da] rounded-2xl text-[16px] font-semibold text-[#4a3f35] hover:bg-[#f9f7f2] transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleIdentify}
            disabled={files.length === 0 || isProcessing}
            className="w-full h-14 bg-[#722f37] rounded-2xl text-[16px] font-semibold text-white flex items-center justify-center gap-2 hover:bg-[#5a252c] transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg"
          >
            {isProcessing ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <>
                <Check size={20} strokeWidth={3} />
                Identificar com IA
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
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
