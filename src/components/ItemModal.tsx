import React, { useState, useEffect } from 'react';
import { Wine, Spirit, Adega } from '../types';
import { ModalShell } from './ModalShell';
import { Camera, RefreshCw, MapPin, Wine as WineIcon, GlassWater, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ItemModalProps {
  item?: Wine | Spirit | null;
  mode: 'wines' | 'spirits';
  adegas: Adega[];
  activeAdegaId?: string;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  preScannedData?: { data: any, imageUrl: string } | null;
}

export function ItemModal({ item, mode, adegas, activeAdegaId, onClose, onSave, preScannedData }: ItemModalProps) {
  const isEdit = !!item;
  const isWine = mode === 'wines';
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'details' | 'notes'>('main');

  const [formData, setFormData] = useState<any>(() => {
    const base = {
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
    };

    if (preScannedData) {
      return {
        ...base,
        imageUrl: preScannedData.imageUrl,
        name: preScannedData.data.nome || base.name,
        producer: preScannedData.data.produtor || base.producer,
        country: preScannedData.data.país || base.country,
        vintage: preScannedData.data.safra || base.vintage,
        grape: preScannedData.data.uva || base.grape,
        type: preScannedData.data.tipo || base.type,
      };
    }
    return base;
  });

  const [loadingSave, setLoadingSave] = useState(false);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormData(prev => ({ ...prev, imageUrl: base64 }));
    };
    reader.readAsDataURL(file);
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
      icon={isWine ? <WineIcon size={20} className="text-brand-wine" /> : <GlassWater size={20} className="text-[#8B4513]" />}
      footer={
        <>
          <button 
            onClick={onClose}
            className="flex-1 py-4 px-6 bg-white border border-parchment rounded-xl text-[11px] font-bold uppercase tracking-widest text-text-muted hover:bg-cream-dark transition-all font-sans"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loadingSave || !formData.name}
            className="flex-1 py-4 px-6 bg-brand-wine text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 font-sans"
          >
            {loadingSave ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
            {isEdit ? 'Salvar Alterações' : 'Adicionar à Adega'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex border-b border-black/5 -mx-6 px-6">
          {[
            { id: 'main', label: 'Info' },
            { id: 'details', label: isWine ? 'Técnico' : 'Detalhes' },
            { id: 'notes', label: 'Notas' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative ${
                activeTab === tab.id ? 'text-brand-wine' : 'text-text-muted opacity-50'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="modalTab" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-wine"
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {activeTab === 'main' && (
              <>
                <div className="flex gap-4 items-start">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted pl-1">Nome da Bebida</label>
                    <input 
                      type="text" 
                      value={formData.name} 
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Chateau Margaux"
                      className="w-full bg-white border border-black/5 rounded-[22px] py-4 px-5 text-base focus:ring-2 focus:ring-brand-gold/10 focus:border-brand-gold/40 outline-none transition-all font-serif italic text-text-main font-bold shadow-sm"
                    />
                  </div>
                  
                  <div className="shrink-0 pt-6">
                    <label className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white border border-black/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden shadow-sm hover:bg-cream-dark transition-all hover:border-brand-gold/30">
                      {formData.imageUrl ? (
                        <img src={formData.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-center">
                          <Camera size={18} className="text-text-muted mx-auto" />
                          <span className="text-[8px] font-bold uppercase tracking-tighter text-text-muted block mt-1">Foto</span>
                        </div>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted pl-1">Produtor</label>
                    <input 
                      type="text" 
                      value={formData.producer}
                      onChange={(e) => setFormData(prev => ({ ...prev, producer: e.target.value }))}
                      className="w-full bg-white border border-black/5 rounded-[18px] py-3 px-4 text-sm focus:border-brand-gold/40 outline-none transition-all font-medium text-text-main"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted pl-1">País</label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted opacity-40" />
                      <input 
                        type="text" 
                        value={formData.country}
                        onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full bg-white border border-black/5 rounded-[18px] py-3 pl-11 pr-4 text-sm focus:border-brand-gold/40 outline-none transition-all font-medium text-text-main"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted pl-1">Adega</label>
                    <select 
                      value={formData.adegaId}
                      onChange={(e) => setFormData(prev => ({ ...prev, adegaId: e.target.value }))}
                      className="w-full bg-white border border-black/5 rounded-[18px] py-3 px-4 text-sm focus:border-brand-gold/40 outline-none transition-all appearance-none font-semibold text-text-main shadow-sm"
                    >
                      {adegas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted pl-1">Quantidade</label>
                    <div className="flex items-center">
                       <button onClick={() => setFormData(prev => ({ ...prev, qty: Math.max(0, prev.qty - 1) }))} className="w-10 h-11 bg-white border border-black/5 rounded-l-[18px] flex items-center justify-center hover:bg-cream-dark transition-all text-text-sub">-</button>
                       <input 
                          type="number" 
                          value={formData.qty} 
                          onChange={(e) => setFormData(prev => ({ ...prev, qty: parseInt(e.target.value) || 0 }))}
                          className="w-full max-w-[50px] bg-white border-y border-black/5 h-11 text-center text-[15px] font-bold text-text-main outline-none" 
                       />
                       <button onClick={() => setFormData(prev => ({ ...prev, qty: prev.qty + 1 }))} className="w-10 h-11 bg-white border border-black/5 rounded-r-[18px] flex items-center justify-center hover:bg-cream-dark transition-all text-text-sub">+</button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'details' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted pl-1">Tipo</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-white border border-black/5 rounded-[18px] py-3 px-4 text-sm focus:border-brand-gold/40 outline-none transition-all appearance-none font-semibold text-text-main shadow-sm"
                  >
                    {isWine ? (
                      ['Tinto', 'Branco', 'Rosé', 'Espumante', 'Porto', 'Sobremesa'].map(t => <option key={t} value={t}>{t}</option>)
                    ) : (
                      ['Whisky', 'Gin', 'Vodka', 'Rum', 'Tequila', 'Licor', 'Cachaça'].map(t => <option key={t} value={t}>{t}</option>)
                    )}
                  </select>
                </div>

                {isWine ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted pl-1">Safra (Vintage)</label>
                      <input 
                        type="text" 
                        value={formData.vintage}
                        onChange={(e) => setFormData(prev => ({ ...prev, vintage: e.target.value }))}
                        placeholder="Ex: 2018"
                        className="w-full bg-white border border-black/5 rounded-[18px] py-3 px-4 text-sm focus:border-brand-gold/40 outline-none transition-all font-medium text-text-main"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted pl-1">Uva</label>
                      <input 
                        type="text" 
                        value={formData.grape}
                        onChange={(e) => setFormData(prev => ({ ...prev, grape: e.target.value }))}
                        placeholder="Ex: Cabernet"
                        className="w-full bg-white border border-black/5 rounded-[18px] py-3 px-4 text-sm focus:border-brand-gold/40 outline-none transition-all font-medium text-text-main"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted pl-1">Janela de Consumo</label>
                      <div className="flex items-center gap-1">
                         <input 
                            type="text" 
                            placeholder="De" 
                            value={formData.drinkFrom || ''} 
                            onChange={(e) => setFormData(prev => ({ ...prev, drinkFrom: e.target.value }))}
                            className="w-full bg-white border border-black/5 rounded-[18px] py-3 px-2 text-center text-xs font-bold text-text-main outline-none focus:border-brand-gold/40" 
                         />
                         <span className="opacity-20">/</span>
                         <input 
                            type="text" 
                            placeholder="Até" 
                            value={formData.drinkUntil || ''} 
                            onChange={(e) => setFormData(prev => ({ ...prev, drinkUntil: e.target.value }))}
                            className="w-full bg-white border border-black/5 rounded-[18px] py-3 px-2 text-center text-xs font-bold text-text-main outline-none focus:border-brand-gold/40" 
                         />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted pl-1">Região / Sub-tipo</label>
                      <input 
                        type="text" 
                        value={formData.region}
                        onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                        className="w-full bg-white border border-black/5 rounded-[18px] py-3 px-4 text-sm focus:border-brand-gold/40 outline-none transition-all font-medium text-text-main"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted pl-1">Graduação (ABV %)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={formData.abv}
                        onChange={(e) => setFormData(prev => ({ ...prev, abv: e.target.value }))}
                        className="w-full bg-white border border-black/5 rounded-[18px] py-3 px-4 text-sm focus:border-brand-gold/40 outline-none transition-all font-bold text-text-main"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-2">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted pl-1">Notas Pessoais</label>
                 <textarea 
                    rows={6} 
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Fatos históricos, valor de compra, presente de quem..."
                    className="w-full bg-white border border-black/5 rounded-[22px] py-4 px-5 text-sm focus:border-brand-gold/40 outline-none transition-all resize-none font-medium text-text-main shadow-sm"
                 />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </ModalShell>
  );
}
