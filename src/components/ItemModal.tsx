import React, { useState, useEffect } from 'react';
import { Wine, Spirit, Adega } from '../types';
import { ModalShell } from './ModalShell';
import { Camera, RefreshCw, Sparkles, MapPin, Wine as WineIcon, GlassWater, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { analyzeLabelGemini, calcDrinkWindowGemini } from '../lib/ai';

interface ItemModalProps {
  item?: Wine | Spirit | null;
  mode: 'wines' | 'spirits';
  adegas: Adega[];
  activeAdegaId?: string;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  autoScan?: boolean;
}

export function ItemModal({ item, mode, adegas, activeAdegaId, onClose, onSave, autoScan }: ItemModalProps) {
  const isEdit = !!item;
  const isWine = mode === 'wines';
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoScan && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [autoScan]);

  const [formData, setFormData] = useState<any>({
    id: item?.id || crypto.randomUUID(),
    adegaId: item?.adegaId || (activeAdegaId !== 'all' ? activeAdegaId : adegas[0]?.id),
    name: item?.name || '',
    producer: item?.producer || '',
    country: item?.country || '',
    type: item?.type || (isWine ? 'Tinto' : 'Whisky'),
    grape: (item as any)?.grape || '',
    vintage: (item as any)?.vintage || '',
    region: (item as any)?.region || '',
    abv: (item as any)?.abv || '',
    qty: item?.qty || 1,
    level: item?.level ?? 100,
    score: item?.score || null,
    notes: item?.notes || '',
    imageUrl: item?.imageUrl || '',
  });

  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  async function handleAIIdentify(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingAI(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setFormData(prev => ({ ...prev, imageUrl: base64 }));
        
        const aiResult = await analyzeLabelGemini(base64);
        if (aiResult) {
          setFormData(prev => ({
            ...prev,
            name: aiResult.nome || prev.name,
            producer: aiResult.produtor || prev.producer,
            country: aiResult.país || prev.country,
            vintage: aiResult.safra || prev.vintage,
            grape: aiResult.uva || prev.grape,
            type: aiResult.tipo || prev.type,
          }));
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAI(false);
    }
  }

  async function handleEnhanceWindow() {
    if (!formData.name || !isWine) return;
    setLoadingAI(true);
    try {
      const window = await calcDrinkWindowGemini(formData as Wine);
      if (window) {
        setFormData(prev => ({ ...prev, drinkFrom: window.drink_from, drinkUntil: window.drink_until }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAI(false);
    }
  }

  async function handleSubmit() {
    setLoadingSave(true);
    try {
      await onSave(formData);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar item.');
    } finally {
      setLoadingSave(false);
    }
  }

  return (
    <ModalShell 
      title={isEdit ? `Editar ${item.name}` : `Novo ${isWine ? 'Vinho' : 'Spirit'}`} 
      onClose={onClose}
      icon={isWine ? <WineIcon size={20} className="text-indigo-600" /> : <GlassWater size={20} className="text-slate-800" />}
      footer={
        <>
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-6 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all font-sans"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loadingSave || !formData.name}
            className="flex-1 py-3 px-6 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 font-sans"
          >
            {loadingSave ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
            {isEdit ? 'Salvar Alterações' : 'Adicionar à Adega'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Top: Image & Essential Info */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-40 shrink-0">
             <label className="relative aspect-[3/4] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-indigo-400 transition-colors">
               {formData.imageUrl ? (
                 <img src={formData.imageUrl} className="w-full h-full object-cover" />
               ) : (
                 <div className="text-center p-4">
                   <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 text-indigo-500 shadow-sm">
                     <Camera size={20} />
                   </div>
                   <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scan Rótulo</p>
                 </div>
               )}
               <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAIIdentify} />
               <div className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                 <Sparkles size={24} className="animate-pulse" />
               </div>
               {loadingAI && (
                 <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                   <RefreshCw size={24} className="animate-spin text-indigo-600" />
                 </div>
               )}
             </label>
          </div>

          <div className="flex-1 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome da Bebida</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Chateau Margaux"
                className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-base focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Produtor</label>
                <input 
                  type="text" 
                  value={formData.producer}
                  onChange={(e) => setFormData(prev => ({ ...prev, producer: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">País</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 opacity-60" />
                  <input 
                    type="text" 
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Info */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Adega</label>
            <select 
              value={formData.adegaId}
              onChange={(e) => setFormData(prev => ({ ...prev, adegaId: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none"
            >
              {adegas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tipo</label>
            <select 
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none"
            >
              {isWine ? (
                ['Tinto', 'Branco', 'Rosé', 'Espumante', 'Porto', 'Sobremesa'].map(t => <option key={t} value={t}>{t}</option>)
              ) : (
                ['Whisky', 'Gin', 'Vodka', 'Rum', 'Tequila', 'Licor', 'Cachaça'].map(t => <option key={t} value={t}>{t}</option>)
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quantidade</label>
            <div className="flex items-center">
               <button onClick={() => setFormData(prev => ({ ...prev, qty: Math.max(0, prev.qty - 1) }))} className="w-10 h-10 border border-slate-200 rounded-l-xl flex items-center justify-center hover:bg-slate-50 transition-all">-</button>
               <input 
                  type="number" 
                  value={formData.qty} 
                  onChange={(e) => setFormData(prev => ({ ...prev, qty: parseInt(e.target.value) || 0 }))}
                  className="w-full max-w-[50px] bg-white border-y border-slate-200 py-2.5 px-2 text-center text-sm outline-none" 
               />
               <button onClick={() => setFormData(prev => ({ ...prev, qty: prev.qty + 1 }))} className="w-10 h-10 border border-slate-200 rounded-r-xl flex items-center justify-center hover:bg-slate-50 transition-all">+</button>
            </div>
          </div>

          {isWine ? (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Safra (Vintage)</label>
                <input 
                  type="text" 
                  value={formData.vintage}
                  onChange={(e) => setFormData(prev => ({ ...prev, vintage: e.target.value }))}
                  placeholder="Ex: 2018"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Uva</label>
                <input 
                  type="text" 
                  value={formData.grape}
                  onChange={(e) => setFormData(prev => ({ ...prev, grape: e.target.value }))}
                  placeholder="Ex: Cabernet"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Janela de Consumo</label>
                <div className="flex items-center gap-1">
                   <input 
                      type="text" 
                      placeholder="De" 
                      value={formData.drinkFrom || ''} 
                      onChange={(e) => setFormData(prev => ({ ...prev, drinkFrom: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-2 text-center text-[10px] outline-none" 
                   />
                   <span className="opacity-40">-</span>
                   <input 
                      type="text" 
                      placeholder="Ate" 
                      value={formData.drinkUntil || ''} 
                      onChange={(e) => setFormData(prev => ({ ...prev, drinkUntil: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-2 text-center text-[10px] outline-none" 
                   />
                   <button onClick={handleEnhanceWindow} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all" title="IA Suggestion">
                     <Sparkles size={14} />
                   </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Região / Sub-tipo</label>
                <input 
                  type="text" 
                  value={formData.region}
                  onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Graduação (ABV %)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={formData.abv}
                  onChange={(e) => setFormData(prev => ({ ...prev, abv: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
           <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notas Pessoais</label>
           <textarea 
              rows={3} 
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Fatos históricos, valor de compra, presente de quem..."
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none"
           />
        </div>
      </div>
    </ModalShell>
  );
}
