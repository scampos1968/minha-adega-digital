import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface ModalShellProps {
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function ModalShell({ title, icon, onClose, children, footer, maxWidth = 'max-w-2xl' }: ModalShellProps) {
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
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={`relative bg-cream border border-black/10 rounded-[20px] w-full ${maxWidth} overflow-hidden shadow-old-lg flex flex-col max-h-[90vh]`}
      >
        <div className="p-7 pb-6 flex items-center justify-between">
           <div className="flex items-center gap-3">
             {icon && <div className="text-xl flex items-center">{icon}</div>}
             <h3 className="text-[22px] text-text-main leading-tight font-serif">{title}</h3>
           </div>
           <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-cream-dark border border-black/10 rounded-lg hover:bg-cream-deep transition-colors text-text-sub">
             <X size={18} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 pb-7">
           {children}
        </div>

        {footer && (
          <div className="px-7 py-5 border-t border-black/5 bg-cream-dark/30 flex justify-between gap-3">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
}
