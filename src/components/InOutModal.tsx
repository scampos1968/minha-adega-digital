import React from 'react';
import { X, Table, FileOutput, Database, Shrink, RefreshCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface InOutModalProps {
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
  onBackup: () => void;
}

export function InOutModal({ onClose, onExport, onImport, onBackup }: InOutModalProps) {
  const options = [
    { label: 'Importar Planilha', desc: 'Carregue vinhos em lote via .xlsx ou .csv', icon: <Table size={24} />, onClick: onImport },
    { label: 'Exportar CSV', desc: 'Planilha CSV para Excel / Google Sheets', icon: <FileOutput size={24} />, onClick: onExport },
    { label: 'Backup & Restore', desc: 'Backup completo com fotos · Restauração total', icon: <Database size={24} />, onClick: onBackup },
    { label: 'Comprimir Fotos', desc: 'Recomprime fotos grandes no Storage (>1 MB)', icon: <Shrink size={24} />, onClick: () => alert('Funcionalidade em desenvolvimento') },
    { label: 'Janelas de Guarda', desc: 'Recalcular via IA para todos os vinhos', icon: <RefreshCcw size={24} />, onClick: () => alert('Funcionalidade em desenvolvimento') },
  ];

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
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white border border-slate-200 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-slate-800 leading-tight">In / Out</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {options.map((opt, i) => (
            <button 
              key={i}
              onClick={opt.onClick}
              className="w-full flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-600 group-hover:text-indigo-600 transition-colors">
                {opt.icon}
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-800 text-sm tracking-tight">{opt.label}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-6 pt-0">
          <button 
            onClick={onClose}
            className="w-full py-4 text-xs font-bold uppercase tracking-[4px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
