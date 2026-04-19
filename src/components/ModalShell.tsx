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
        className="absolute inset-0 bg-text-main/40 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`relative bg-cream border border-parchment/20 rounded-[32px] w-full ${maxWidth} overflow-hidden shadow-2xl flex flex-col max-h-[90vh]`}
      >
        <div className="p-6 md:p-8 flex items-center justify-between border-b border-parchment/10 bg-white/50">
           <div className="flex items-center gap-3">
             {icon && <div className="text-xl">{icon}</div>}
             <h3 className="text-xl font-serif italic text-text-main leading-tight">{title}</h3>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-cream2 rounded-full transition-colors text-text-sub">
             <X size={20} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
           {children}
        </div>

        {footer && (
          <div className="p-6 border-t border-parchment/10 bg-white/50 flex justify-between gap-3">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
}
