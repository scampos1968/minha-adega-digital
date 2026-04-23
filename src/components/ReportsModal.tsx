import React from 'react';
import { Database, FileOutput, RefreshCcw, X } from 'lucide-react';
import { motion } from 'motion/react';
import { BackupManifest, BackupPreview, BackupTableName, buildBackupPreview, parseBackupFileContent } from '../lib/backup';

interface ReportsModalProps {
  onClose: () => void;
  onBackup: () => void;
  onRestore: (backup: BackupManifest) => void;
  existingIds: Record<BackupTableName, Set<string>>;
}

export function ReportsModal({ 
  onClose, 
  onBackup,
  onRestore,
  existingIds,
}: ReportsModalProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<BackupPreview | null>(null);
  const [parsedBackup, setParsedBackup] = React.useState<BackupManifest | null>(null);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFileSelection(file: File) {
    setSelectedFile(file);
    setPreview(null);
    setParsedBackup(null);
    setWarnings([]);
    setError(null);

    try {
      const text = await file.text();
      const parsed = parseBackupFileContent(text);
      const nextPreview = buildBackupPreview(parsed.backup, existingIds);
      setParsedBackup(parsed.backup);
      setPreview({ ...nextPreview, warnings: parsed.warnings });
      setWarnings(parsed.warnings);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const totalRows = preview?.rows.reduce((acc, row) => acc + row.total, 0) || 0;

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
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await handleFileSelection(file);
                }}
                accept=".json"
              />
            </div>
          </div>

          {(selectedFile || error || preview) && (
            <div className="rounded-[28px] border border-black/10 bg-white/80 p-5 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-sub">Preview do Restore</p>
                {selectedFile && (
                  <p className="text-[13px] font-bold text-text-main break-all">{selectedFile.name}</p>
                )}
              </div>

              {error && (
                <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
                  {error}
                </div>
              )}

              {preview && (
                <>
                  <div className="grid grid-cols-2 gap-3 text-[12px] text-text-sub">
                    <div className="rounded-[20px] bg-cream-dark/30 px-4 py-3">
                      <div className="font-bold uppercase tracking-widest text-[10px]">Versão</div>
                      <div className="mt-1 font-semibold text-text-main">{preview.backupVersion}</div>
                    </div>
                    <div className="rounded-[20px] bg-cream-dark/30 px-4 py-3">
                      <div className="font-bold uppercase tracking-widest text-[10px]">Registros</div>
                      <div className="mt-1 font-semibold text-text-main">{totalRows}</div>
                    </div>
                    <div className="rounded-[20px] bg-cream-dark/30 px-4 py-3 col-span-2">
                      <div className="font-bold uppercase tracking-widest text-[10px]">Origem</div>
                      <div className="mt-1 font-semibold text-text-main">{preview.source.environment}</div>
                      <div className="text-[11px] text-text-sub mt-1">
                        {preview.source.supabase_url || 'Origem Supabase não informada'}
                      </div>
                    </div>
                    <div className="rounded-[20px] bg-cream-dark/30 px-4 py-3 col-span-2">
                      <div className="font-bold uppercase tracking-widest text-[10px]">Criado em</div>
                      <div className="mt-1 font-semibold text-text-main">
                        {new Date(preview.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>

                  {warnings.length > 0 && (
                    <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
                      {warnings.map((warning) => (
                        <p key={warning} className="text-[12px] font-semibold text-amber-800">
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    {preview.rows.map((row) => (
                      <div key={row.table} className="rounded-[20px] border border-black/5 bg-cream/60 px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-text-main">{row.table}</div>
                            <div className="text-[11px] text-text-sub mt-1">{row.total} registro(s) no arquivo</div>
                          </div>
                          <div className="text-right text-[11px] font-semibold text-text-sub">
                            <div>{row.updates} update(s)</div>
                            <div>{row.inserts} insert(s)</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[20px] border border-black/10 bg-brand-wine/5 px-4 py-3 text-[12px] text-text-sub leading-relaxed">
                    O restore v1 faz <strong className="text-text-main">merge por ID</strong>. Registros com IDs já existentes serão atualizados. IDs diferentes entram como novos registros, sem deduplicação semântica.
                  </div>

                  <button
                    onClick={() => parsedBackup && onRestore(parsedBackup)}
                    disabled={!parsedBackup}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-brand-wine text-white rounded-[20px] text-[14px] font-bold uppercase tracking-[0.1em] hover:bg-brand-wine/90 active:scale-[0.98] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar Restauração
                  </button>
                </>
              )}
            </div>
          )}
          
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
