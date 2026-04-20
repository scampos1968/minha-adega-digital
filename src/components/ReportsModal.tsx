import React from 'react';
import { Database, FileOutput, RefreshCcw, X } from 'lucide-react';
import { motion } from 'motion/react';

interface ReportsModalProps {
  onClose: () => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
}

export function ReportsModal({ 
  onClose, 
  onBackup,
  onRestore 
}: ReportsModalProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#1a1512]/60 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-cream border border-parchment/50 rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-brand-wine/10 rounded-xl flex items-center justify-center">
                <Database className="text-brand-wine" size={20} />
             </div>
             <div>
               <h2 className="text-[20px] font-serif italic text-text-main leading-tight">Gestão da Base</h2>
               <p className="text-[11px] text-text-sub font-sans font-bold uppercase tracking-widest mt-0.5">Segurança & Backup</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-cream-dark/50 text-text-sub hover:text-text-main transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 pt-2 space-y-6">
          <div className="p-6 bg-cream-dark/30 border border-brand-wine/10 rounded-[28px] space-y-5">
            <p className="text-[13px] text-text-sub leading-relaxed font-sans text-center">
              Mantenha seus dados seguros. Use o backup para salvar uma cópia local ou a restauração para recuperar seus dados em caso de troca de dispositivo.
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={onBackup}
                className="w-full flex items-center justify-center gap-3 py-4 bg-brand-wine text-white rounded-[20px] text-[14px] font-bold uppercase tracking-[0.1em] hover:bg-brand-wine/90 active:scale-[0.98] transition-all shadow-md group"
              >
                <FileOutput size={18} className="group-hover:translate-y-[-1px] transition-transform" />
                Backup Total de Dados
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-black/10 text-text-main rounded-[20px] text-[14px] font-bold uppercase tracking-[0.1em] hover:bg-cream-dark active:scale-[0.98] transition-all shadow-sm group"
              >
                <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                Restaurar Base Completa
              </button>
              
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onRestore(file);
                }}
                accept=".json"
              />
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-1 opacity-50 px-4">
             <div className="w-1 h-1 rounded-full bg-brand-gold" />
             <p className="text-[9px] text-text-sub uppercase tracking-[0.2em] font-bold text-center">
                O backup inclui vinhos, spirits, adegas e histórico completo.
             </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-cream-dark/10 border-t border-black/5 flex items-center justify-center">
          <button 
            onClick={onClose}
            className="w-full py-4 text-[13px] font-bold text-text-sub hover:text-text-main transition-colors uppercase tracking-[0.2em]"
          >
            Voltar para Adega
          </button>
        </div>
      </motion.div>
    </div>
  );
}
