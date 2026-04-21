import React from 'react';
import { X, BarChart3, Wine, GlassWater, History, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { Wine as WineType, Spirit, Adega, Consumption, SpiritConsumption } from '../types';

interface StatsModalProps {
  onClose: () => void;
  wines: WineType[];
  spirits: Spirit[];
  consumptions: Consumption[];
  spiritCons: SpiritConsumption[];
  adegas: Adega[];
  context?: {
    mode: 'wines' | 'spirits';
    view: 'cellar' | 'history';
    adegaId: string;
  } | null;
}

export function StatsModal({ onClose, wines, spirits, consumptions, spiritCons, adegas, context }: StatsModalProps) {
  // If context is null, it's the "Global Statistics" (bottom button)
  const isGlobal = !context;
  const currentYear = 2026;
  
  // Filtering data based on context
  let filteredWines = wines;
  let filteredSpirits = spirits;
  let filteredConsumptions = consumptions;
  let filteredSpiritCons = spiritCons;

  if (!context || context.view === 'cellar') {
    // Current inventory: exclude items with qty 0
    filteredWines = wines.filter(w => w.qty > 0);
    filteredSpirits = spirits.filter(s => s.qty > 0);
    
    if (context && context.adegaId !== 'all') {
      filteredWines = filteredWines.filter(w => w.adegaId === context.adegaId);
      filteredSpirits = filteredSpirits.filter(s => s.adegaId === context.adegaId);
    }
  } else if (context.view === 'history') {
    // History reports: analyze consumed items
    if (context.mode === 'wines') {
      // Use items from history (can have duplicates if consumed multiple times, which is correct for history volume)
      filteredWines = consumptions
        .filter(c => context.adegaId === 'all' ? true : c.wineSnapshot.adegaId === context.adegaId)
        .map(c => c.wineSnapshot as WineType);
    } else {
      filteredSpirits = spiritCons
        .filter(c => context.adegaId === 'all' ? true : c.spiritSnapshot.adegaId === context.adegaId)
        .map(c => c.spiritSnapshot as Spirit);
    }
  }

  const activeAdega = context?.adegaId === 'all' ? { id: 'all', name: 'Todas as Adegas', emoji: '🏢' } : (adegas.find(a => a.id === context?.adegaId) || { id: 'all', name: 'Todas as Adegas', emoji: '🏢' });

  const totalWines = context?.view === 'history' 
    ? consumptions.filter(c => context.adegaId === 'all' ? true : c.wineSnapshot.adegaId === context.adegaId).reduce((acc, c) => acc + (c.qty || 0), 0)
    : filteredWines.reduce((acc, w) => acc + w.qty, 0);
    
  const totalSpirits = context?.view === 'history'
    ? spiritCons.filter(c => context.adegaId === 'all' ? true : c.spiritSnapshot.adegaId === context.adegaId).length
    : filteredSpirits.reduce((acc, s) => acc + s.qty, 0);

  // Specialized Wine Stats
  const wineStats = React.useMemo(() => {
    if (context?.mode !== 'wines' && !isGlobal) return null;

    const labels = filteredWines.length;
    const itemsWithScore = filteredWines.filter(w => w.score && w.score > 0);
    const avgScore = itemsWithScore.length > 0 
      ? Math.round(itemsWithScore.reduce((acc, w) => acc + w.score!, 0) / itemsWithScore.length) 
      : 0;
    
    const vintages = filteredWines
      .map(w => parseInt(w.vintage || ''))
      .filter(v => !isNaN(v) && v > 1800);
    const oldestVintage = vintages.length > 0 ? Math.min(...vintages) : '—';

    // Helper for distributions
    const getDist = (arr: any[], key: string, limit = 5) => {
      const counts: Record<string, number> = {};
      arr.forEach(item => {
        const val = item[key] || 'Não Inf.';
        counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
    };

    const typeDist = getDist(filteredWines, 'type');
    const countryDist = getDist(filteredWines, 'country');
    const grapeDist = getDist(filteredWines, 'grape');

    // Guarda Windows
    const guarda = {
      aguardar: 0,
      noPonto: 0,
      passando: 0,
      passou: 0
    };

    filteredWines.forEach(w => {
      if (w.qty <= 0) return;
      if (!w.drinkFrom && !w.drinkUntil) return;
      
      const from = w.drinkFrom || 0;
      const until = w.drinkUntil || 9999;

      if (from > currentYear) guarda.aguardar += w.qty;
      else if (currentYear >= from && currentYear <= until - 2) guarda.noPonto += w.qty;
      else if (currentYear > until - 2 && currentYear <= until) guarda.passando += w.qty;
      else if (currentYear > until) guarda.passou += w.qty;
    });

    return { labels, totalBottles: totalWines, avgScore, oldestVintage, typeDist, countryDist, grapeDist, guarda };
  }, [filteredWines, context, totalWines]);

  // Specialized Spirits Stats
  const spiritStats = React.useMemo(() => {
    if (context?.mode !== 'spirits' && !isGlobal) return null;

    const labels = filteredSpirits.length;
    const itemsWithScore = filteredSpirits.filter(s => s.score && s.score > 0);
    const avgScore = itemsWithScore.length > 0 
      ? Math.round(itemsWithScore.reduce((acc, s) => acc + s.score!, 0) / itemsWithScore.length) 
      : 0;
    
    // Helper for distributions
    const getDist = (arr: any[], key: string, limit = 8) => {
      const counts: Record<string, number> = {};
      arr.forEach(item => {
        const val = item[key] || 'Outro';
        counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
    };

    const typeDist = getDist(filteredSpirits, 'type');
    const countryDist = getDist(filteredSpirits, 'country', 5);

    // Levels Distribution
    const levels = {
      cheios: filteredSpirits.filter(s => (s.level || 1) >= 0.8).length,
      meio: filteredSpirits.filter(s => (s.level || 1) < 0.8 && (s.level || 1) >= 0.3).length,
      vazios: filteredSpirits.filter(s => (s.level || 1) < 0.3).length
    };

    return { labels, evaluated: itemsWithScore.length, avgScore, typeDist, countryDist, levels };
  }, [filteredSpirits, context]);

  // Stats per adega (only relevant for global or 'all')
  const adegaStats = adegas.map(adega => {
    const adegaWines = wines.filter(w => w.adegaId === adega.id).reduce((acc, w) => acc + w.qty, 0);
    const adegaSpirits = spirits.filter(s => s.adegaId === adega.id).reduce((acc, s) => acc + s.qty, 0);
    return {
      ...adega,
      wines: adegaWines,
      spirits: adegaSpirits,
      total: adegaWines + adegaSpirits
    };
  });

  const getTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('tinto')) return 'bg-[#722f37]';
    if (t.includes('espumante')) return 'bg-[#4682b4]';
    if (t.includes('branco')) return 'bg-[#b8860b]';
    if (t.includes('rosé')) return 'bg-[#c08081]';
    if (t.includes('porto')) return 'bg-[#4b0082]';
    return 'bg-brand-gold';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 100 }}
        className="relative bg-[#faf7f2] border-t sm:border border-black/10 rounded-t-[32px] sm:rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[95vh]"
      >
        {/* Header - Specialized Style */}
        <div className="px-5 py-4 sm:px-8 sm:py-6 flex items-center justify-between border-b border-black/5 bg-white/50">
          <div className="flex items-center gap-3 sm:gap-4">
             <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-black/5 flex items-center justify-center text-xl sm:text-2xl">
                {isGlobal ? <BarChart3 className="text-brand-wine" size={20} /> : activeAdega.emoji}
             </div>
             <div className="min-w-0">
               <h2 className="text-xl sm:text-2xl font-serif italic text-text-main font-bold truncate">
                 {isGlobal ? 'Estatísticas Globais' : activeAdega.name}
               </h2>
               <p className="text-[8px] sm:text-[10px] text-text-sub font-sans font-bold uppercase tracking-widest mt-0.5 truncate">
                 {isGlobal ? 'Visão Geral do Acervo' : `Relatório de ${context?.mode === 'wines' ? 'Vinhos' : 'Spirits'}`}
               </p>
             </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-cream-dark/50 border border-black/5 rounded-full text-text-sub hover:bg-cream-deep transition-all shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-5 sm:space-y-6">
          {wineStats ? (
            /* SPECIALIZED WINE REPORT LAYOUT */
            <div className="space-y-5 sm:space-y-6">
              {/* Summary Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {[
                  { label: 'RÓTULOS', value: wineStats.labels },
                  { label: 'GARRAFAS', value: wineStats.totalBottles },
                  { label: 'PTS (AV)', value: wineStats.avgScore },
                  { label: '+ ANTIGO', value: wineStats.oldestVintage }
                ].map((card, i) => (
                  <div key={i} className="bg-white/80 p-3 sm:p-4 rounded-xl border border-black/5 shadow-sm">
                    <p className="text-2xl sm:text-3xl font-serif text-text-main font-bold leading-none">{card.value}</p>
                    <p className="text-[8px] sm:text-[9px] font-bold text-text-muted mt-1.5 sm:mt-2 tracking-wider uppercase truncate">
                      {card.label === 'RÓTULOS' && context?.view === 'history' ? 'EVENTOS' : card.label === 'GARRAFAS' && context?.view === 'history' ? 'CONSUMIDAS' : card.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Distributions Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* POR TIPO */}
                <div className="bg-white p-5 sm:p-6 rounded-[24px] border border-black/5 shadow-sm space-y-3 sm:space-y-4">
                   <h4 className="text-[9px] sm:text-[10px] font-black text-[#8a6040] uppercase tracking-[0.2em]">POR TIPO</h4>
                   <div className="space-y-2.5 sm:space-y-3">
                      {wineStats.typeDist.map(([type, count]) => (
                        <div key={type} className="space-y-1">
                          <div className="flex justify-between items-center text-[11px] sm:text-xs font-medium">
                            <span className="text-text-main capitalize truncate mr-2">{type}</span>
                            <span className="text-text-muted shrink-0 text-[10px] sm:text-xs">{count}</span>
                          </div>
                          <div className="h-1.5 sm:h-2 bg-cream-dark rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getTypeColor(type)} rounded-full`}
                              style={{ width: `${(count / Math.max(1, wineStats.labels)) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                   </div>
                </div>

                {/* TOP PAÍSES */}
                <div className="bg-white p-5 sm:p-6 rounded-[24px] border border-black/5 shadow-sm space-y-3 sm:space-y-4">
                   <h4 className="text-[9px] sm:text-[10px] font-black text-[#8a6040] uppercase tracking-[0.2em]">TOP PAÍSES</h4>
                   <div className="space-y-2.5 sm:space-y-3">
                      {wineStats.countryDist.map(([country, count]) => (
                        <div key={country} className="space-y-1">
                          <div className="flex justify-between items-center text-[11px] sm:text-xs font-medium">
                            <span className="text-text-main truncate mr-2">{country}</span>
                            <span className="text-text-muted shrink-0 text-[10px] sm:text-xs">{count}</span>
                          </div>
                          <div className="h-1.5 sm:h-2 bg-cream-dark rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#722f37] rounded-full opacity-80"
                              style={{ width: `${(count / Math.max(1, wineStats.labels)) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>

              {/* TOP UVAS */}
              <div className="bg-white p-5 sm:p-6 rounded-[24px] border border-black/5 shadow-sm space-y-3 sm:space-y-4">
                  <h4 className="text-[9px] sm:text-[10px] font-black text-[#8a6040] uppercase tracking-[0.2em]">TOP UVAS</h4>
                  <div className="space-y-2.5 sm:space-y-3">
                     {wineStats.grapeDist.map(([grape, count]) => (
                        <div key={grape} className="space-y-1">
                          <div className="flex justify-between items-center text-[11px] sm:text-xs font-medium">
                            <span className="text-text-main truncate mr-2">{grape}</span>
                            <span className="text-text-muted shrink-0 text-[10px] sm:text-xs">{count}</span>
                          </div>
                          <div className="h-1.5 sm:h-2 bg-[#f4f1ea] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#8a6040] rounded-full opacity-70"
                              style={{ width: `${(count / Math.max(1, wineStats.labels)) * 100}%` }}
                            />
                          </div>
                        </div>
                     ))}
                  </div>
              </div>

              {/* JANELAS DE GUARDA */}
              <div className="space-y-2.5 sm:space-y-3">
                <h4 className="text-[9px] sm:text-[10px] font-black text-[#8a6040] uppercase tracking-[0.2em] px-1 text-center">JANELAS DE GUARDA</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                   {[
                     { label: 'Aguardar', value: wineStats.guarda.aguardar, icon: '⏳', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                     { label: 'No ponto', value: wineStats.guarda.noPonto, icon: '🎯', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                     { label: 'Passando', value: wineStats.guarda.passando, icon: '⚠️', color: 'bg-amber-50 text-amber-700 border-amber-100' },
                     { label: 'Passou', value: wineStats.guarda.passou, icon: '🌋', color: 'bg-red-50 text-red-700 border-red-100' }
                   ].map((item, i) => (
                     <div key={i} className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border flex flex-col items-center justify-center gap-0.5 sm:gap-1 shadow-sm ${item.color}`}>
                        <span className="text-lg sm:text-xl font-bold">{item.value}</span>
                        <div className="flex items-center gap-1 mt-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-tight">
                           <span>{item.icon}</span>
                           <span className="truncate">{item.label}</span>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          ) : spiritStats ? (
            /* SPECIALIZED SPIRITS REPORT LAYOUT */
            <div className="space-y-5 sm:space-y-6">
              {/* Summary Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {[
                  { label: 'SPIRITS', value: spiritStats.labels },
                  { label: 'AVALIADOS', value: spiritStats.evaluated },
                  { label: 'SCORE MÉDIO', value: spiritStats.avgScore }
                ].map((card, i) => (
                  <div key={i} className={`bg-[#f2eee8] p-3 sm:p-4 rounded-xl border border-black/5 shadow-sm ${i === 2 ? 'col-span-2 sm:col-span-1' : ''}`}>
                    <p className="text-2xl sm:text-3xl font-serif text-text-main font-bold leading-none">{card.value}</p>
                    <p className="text-[8px] sm:text-[9px] font-bold text-text-muted mt-1.5 sm:mt-2 tracking-wider uppercase truncate">
                      {card.label === 'SPIRITS' && context?.view === 'history' ? 'EVENTOS' : card.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Distributions Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* POR TIPO */}
                <div className="bg-white p-5 sm:p-6 rounded-[24px] border border-black/5 shadow-sm space-y-3 sm:space-y-4">
                   <h4 className="text-[9px] sm:text-[10px] font-black text-[#8a6040] uppercase tracking-[0.2em]">POR TIPO</h4>
                   <div className="space-y-2.5 sm:space-y-3">
                      {spiritStats.typeDist.map(([type, count]) => (
                        <div key={type} className="space-y-1">
                          <div className="flex justify-between items-center text-[11px] sm:text-xs font-medium">
                            <span className="text-text-main capitalize truncate mr-2">{type}</span>
                            <span className="text-text-muted shrink-0 text-[10px] sm:text-xs">{count}</span>
                          </div>
                          <div className="h-1.5 sm:h-2 bg-cream-dark rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#3d6e50] rounded-full"
                              style={{ width: `${(count / Math.max(1, spiritStats.labels)) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                   </div>
                </div>

                {/* TOP PAÍSES */}
                <div className="bg-white p-5 sm:p-6 rounded-[24px] border border-black/5 shadow-sm space-y-3 sm:space-y-4">
                   <h4 className="text-[9px] sm:text-[10px] font-black text-[#8a6040] uppercase tracking-[0.2em]">TOP PAÍSES</h4>
                   <div className="space-y-2.5 sm:space-y-3">
                      {spiritStats.countryDist.map(([country, count]) => (
                        <div key={country} className="space-y-1">
                          <div className="flex justify-between items-center text-[11px] sm:text-xs font-medium">
                            <span className="text-text-main truncate mr-2">{country}</span>
                            <span className="text-text-muted shrink-0 text-[10px] sm:text-xs">{count}</span>
                          </div>
                          <div className="h-1.5 sm:h-2 bg-cream-dark rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#8b4513] rounded-full opacity-80"
                              style={{ width: `${(count / Math.max(1, spiritStats.labels)) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>

              {/* DISTRIBUIÇÃO DE NÍVEIS */}
              <div className="space-y-2.5 sm:space-y-3">
                <h4 className="text-[9px] sm:text-[10px] font-black text-[#8a6040] uppercase tracking-[0.2em] px-1 text-center">DISTRIBUIÇÃO DE NÍVEIS</h4>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                   {[
                     { label: 'Cheios', value: spiritStats.levels.cheios, icon: '🟢', color: 'bg-[#f0f9f4] text-[#166534] border-[#dcfce7]' },
                     { label: 'Meio', value: spiritStats.levels.meio, icon: '🟡', color: 'bg-[#fefce8] text-[#854d0e] border-[#fef9c3]' },
                     { label: 'Vazios', value: spiritStats.levels.vazios, icon: '🔴', color: 'bg-[#fef2f2] text-[#991b1b] border-[#fee2e2]' }
                   ].map((item, i) => (
                     <div key={i} className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border flex flex-col items-center justify-center gap-0.5 sm:gap-1 shadow-sm ${item.color}`}>
                        <span className="text-lg sm:text-xl font-bold">{item.value}</span>
                        <div className="flex items-center gap-1 mt-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-tight">
                           <span>{item.icon}</span>
                           <span className="truncate">{item.label}</span>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          ) : (
            /* DEFAULT / HISTORY LAYOUT */
            <div className="space-y-6 sm:space-y-8">
              {/* Content Summary */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
             {(!context || context.mode === 'wines') && (
               <div className={`bg-white p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] border border-black/5 shadow-sm space-y-0.5 sm:space-y-1 ${!isGlobal && context?.mode === 'wines' ? 'col-span-2' : ''}`}>
                  <p className="text-[9px] sm:text-[10px] font-bold text-text-muted uppercase tracking-wider">Garrafas de Vinho</p>
                  <div className="flex items-center gap-2">
                     <span className="text-2xl sm:text-3xl font-serif italic font-bold text-brand-wine leading-tight">{totalWines}</span>
                     <Wine size={18} className="text-brand-wine opacity-20" />
                  </div>
               </div>
             )}
             {(!context || context.mode === 'spirits') && (
               <div className={`bg-white p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] border border-black/5 shadow-sm space-y-0.5 sm:space-y-1 ${!isGlobal && context?.mode === 'spirits' ? 'col-span-2' : ''}`}>
                  <p className="text-[9px] sm:text-[10px] font-bold text-text-muted uppercase tracking-wider">Garrafas de Spirits</p>
                  <div className="flex items-center gap-2">
                     <span className="text-2xl sm:text-3xl font-serif italic font-bold text-[#8B4513] leading-tight">{totalSpirits}</span>
                     <GlassWater className="text-[#8B4513] opacity-20" size={18} />
                  </div>
               </div>
             )}
          </div>

          {/* Adega Breakdown (Show only if global or specific adega context) */}
          {(isGlobal || context?.adegaId === 'all') ? (
            <div className="space-y-3 sm:space-y-4">
               <div className="flex items-center justify-between px-1">
                  <h4 className="text-[9px] sm:text-[10px] font-black text-[#8a6040] uppercase tracking-[0.25em]">Estoque por Localização</h4>
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
               </div>
               
               <div className="space-y-2.5 sm:space-y-3">
                  {adegaStats.map(stat => (
                    <div key={stat.id} className="bg-white border border-black/5 rounded-[20px] sm:rounded-[22px] p-3.5 sm:p-4 flex flex-col gap-3 sm:gap-4 shadow-sm">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <span className="text-xl sm:text-2xl shrink-0">{stat.emoji}</span>
                            <span className="text-[14px] sm:text-[15px] font-bold text-text-main truncate">{stat.name}</span>
                         </div>
                         <div className="bg-cream-dark px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold text-text-sub shrink-0">
                            {stat.total} un.
                         </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                         <div className="flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 bg-brand-wine/5 rounded-lg sm:rounded-xl border border-brand-wine/5">
                            <Wine size={12} className="text-brand-wine opacity-50" />
                            <span className="text-[11px] sm:text-[13px] font-medium text-brand-wine truncate">{stat.wines} vinhos</span>
                         </div>
                         <div className="flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 bg-[#8B4513]/5 rounded-lg sm:rounded-xl border border-[#8B4513]/5">
                            <GlassWater size={12} className="text-[#8B4513] opacity-50" />
                            <span className="text-[11px] sm:text-[13px] font-medium text-[#8B4513] truncate">{stat.spirits} spirits</span>
                         </div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          ) : (
            // Specific Adega Insight
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between px-1">
                 <h4 className="text-[9px] sm:text-[10px] font-black text-[#8a6040] uppercase tracking-[0.25em]">Análise da Adega</h4>
                 <TrendingUp className="text-brand-gold opacity-50" size={12} />
              </div>
              <div className="p-5 sm:p-6 bg-white border border-black/5 rounded-[24px] sm:rounded-[28px] shadow-sm flex flex-col items-center text-center space-y-2.5 sm:space-y-3">
                <span className="text-3xl sm:text-4xl">{adegas.find(a => a.id === context?.adegaId)?.emoji}</span>
                <h3 className="text-[16px] sm:text-lg font-bold text-text-main">{adegas.find(a => a.id === context?.adegaId)?.name}</h3>
                <p className="text-[13px] sm:text-sm text-text-sub leading-relaxed max-w-[240px] sm:max-w-none">
                  Você possui atualmente <span className="font-bold text-brand-wine">{context?.mode === 'wines' ? totalWines : totalSpirits}</span> {context?.mode === 'wines' ? 'vinhos' : 'spirits'} nesta localização.
                </p>
                <div className="w-full h-1 bg-cream-dark rounded-full overflow-hidden mt-1">
                   <div 
                    className="h-full bg-brand-wine" 
                    style={{ width: `${Math.min(100, (totalWines + totalSpirits) * 2)}%` }} 
                   />
                </div>
              </div>
            </div>
          )}

          {/* Usage History (Show only if global or in history view) */}
          {(isGlobal || context?.view === 'history') && (
            <div className="space-y-3 sm:space-y-4">
               <div className="flex items-center justify-between px-1">
                  <h4 className="text-[9px] sm:text-[10px] font-black text-[#8a6040] uppercase tracking-[0.25em]">Histórico de Consumo</h4>
                  <History className="text-brand-gold opacity-50" size={12} />
               </div>

               <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {(!context || context.mode === 'wines') && (
                    <div className={`bg-[#f0f4ff] border border-[#e0e7ff] p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] shadow-sm space-y-0.5 sm:space-y-1 ${!isGlobal && context?.mode === 'wines' ? 'col-span-2' : ''}`}>
                       <p className="text-[9px] sm:text-[10px] font-bold text-[#4f46e5]/70 uppercase tracking-wider">Histórico Vinhos</p>
                       <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="text-xl sm:text-2xl font-serif italic font-bold text-[#4f46e5] leading-tight">{filteredConsumptions.length}</span>
                          <p className="text-[9px] sm:text-[10px] font-bold text-[#4f46e5]/50 uppercase">reg.</p>
                       </div>
                    </div>
                  )}
                  {(!context || context.mode === 'spirits') && (
                    <div className={`bg-[#fdf2f2] border border-[#fecaca] p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] shadow-sm space-y-0.5 sm:space-y-1 ${!isGlobal && context?.mode === 'spirits' ? 'col-span-2' : ''}`}>
                       <p className="text-[9px] sm:text-[10px] font-bold text-[#b91c1c]/70 uppercase tracking-wider">Histórico Spirits</p>
                       <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="text-xl sm:text-2xl font-serif italic font-bold text-[#b91c1c] leading-tight">{filteredSpiritCons.length}</span>
                          <p className="text-[9px] sm:text-[10px] font-bold text-[#b91c1c]/50 uppercase">reg.</p>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>
      )}
    </div>

        {/* Footer */}
        <div className="px-5 py-4 sm:px-8 sm:py-6 border-t border-black/5 bg-white shrink-0">
           <button 
            onClick={onClose}
            className="w-full py-3.5 sm:py-4 bg-brand-wine text-white rounded-xl sm:rounded-[22px] text-sm font-bold shadow-lg shadow-brand-wine/10 hover:brightness-110 active:scale-[0.99] transition-all"
           >
              Entendido
           </button>
        </div>
      </motion.div>
    </div>
  );
}
