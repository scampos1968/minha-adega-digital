import React, { useMemo } from 'react';
import { Wine, Spirit, Adega, Consumption, SpiritConsumption } from '../types';
import { X, Table, FileOutput, Database, RefreshCcw, Star, Clock, Target, AlertTriangle, Flame } from 'lucide-react';
import { motion } from 'motion/react';

interface ReportsModalProps {
  wines: Wine[];
  spirits: Spirit[];
  adegas: Adega[];
  consumptions: Consumption[];
  spiritCons: SpiritConsumption[];
  view: 'cellar' | 'history';
  mode: 'wines' | 'spirits';
  activeAdegaId: string;
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
  onBackup: () => void;
}

const BarChartIcon = () => (
  <div className="flex items-end gap-[2px] w-6 h-6">
    <div className="w-1.5 h-[50%] bg-[#4285F4] rounded-sm" />
    <div className="w-1.5 h-[100%] bg-[#34A853] rounded-sm" />
    <div className="w-1.5 h-[80%] bg-[#EA4335] rounded-sm" />
  </div>
);

export function ReportsModal({ 
  wines, 
  spirits, 
  adegas, 
  consumptions, 
  spiritCons,
  view,
  mode,
  activeAdegaId,
  onClose, 
  onExport, 
  onImport, 
  onBackup 
}: ReportsModalProps) {
  
  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const adegaFilter = (item: any) => activeAdegaId === 'all' || item.adegaId === activeAdegaId;
    
    // Filter source data by active adega
    const filteredWines = wines.filter(adegaFilter);
    const filteredSpirits = spirits.filter(adegaFilter);
    const filteredCons = consumptions.filter(c => {
      const w = wines.find(x => x.id === c.wineId);
      return w && adegaFilter(w);
    });
    const filteredSpiritCons = spiritCons.filter(c => {
      const s = spirits.find(x => x.id === c.spiritId);
      return s && adegaFilter(s);
    });

    if (view === 'cellar') {
      if (mode === 'wines') {
        const totalQty = filteredWines.reduce((acc, w) => acc + w.qty, 0);
        const uniqueLabels = filteredWines.length;
        const winesWithScore = filteredWines.filter(w => w.score);
        const avgScore = winesWithScore.length 
          ? Math.round(winesWithScore.reduce((acc, w) => acc + (w.score || 0), 0) / winesWithScore.length)
          : 0;
        const oldestVintage = filteredWines.reduce((min, w) => {
          if (!w.vintage) return min;
          const v = parseInt(w.vintage);
          return isNaN(v) ? min : (min ? Math.min(min, v) : v);
        }, 0 as number | null);

        // Types
        const typeCounts: Record<string, number> = {};
        filteredWines.forEach(w => {
          typeCounts[w.type] = (typeCounts[w.type] || 0) + w.qty;
        });

        // Countries
        const countryCounts: Record<string, number> = {};
        filteredWines.forEach(w => {
          if (w.country) countryCounts[w.country] = (countryCounts[w.country] || 0) + w.qty;
        });

        // Grapes
        const grapeCounts: Record<string, number> = {};
        filteredWines.forEach(w => {
          if (w.grape) grapeCounts[w.grape] = (grapeCounts[w.grape] || 0) + w.qty;
        });

        // Maturity
        let aguardar = 0, noPonto = 0, passando = 0, passou = 0;
        filteredWines.forEach(w => {
          if (w.drinkFrom && w.drinkUntil) {
            if (currentYear < w.drinkFrom) aguardar += w.qty;
            else if (currentYear <= w.drinkUntil) noPonto += w.qty;
            else if (currentYear <= w.drinkUntil + 2) passando += w.qty;
            else passou += w.qty;
          }
        });

        return {
          title: adegas.find(a => a.id === activeAdegaId)?.name || 'Minha Adega',
          isHistory: false,
          topCards: [
            { label: 'Rótulos', value: uniqueLabels },
            { label: 'Garrafas', value: totalQty },
            { label: 'PTS', value: avgScore },
            { label: '+ Antigo', value: oldestVintage || '—' }
          ],
          tables: [
            { title: 'POR TIPO', data: typeCounts, color: 'text-brand-wine' },
            { title: 'TOP PAÍSES', data: countryCounts, color: 'text-[#8B4513]' }
          ],
          bars: { title: 'TOP UVAS', data: grapeCounts },
          maturity: [
            { label: 'Aguardar', count: aguardar, color: 'bg-blue-100 text-blue-600', icon: <Clock size={14} /> },
            { label: 'No ponto', count: noPonto, color: 'bg-emerald-100 text-emerald-600', icon: <Target size={14} /> },
            { label: 'Passando', count: passando, color: 'bg-amber-100 text-amber-600', icon: <AlertTriangle size={14} /> },
            { label: 'Passou', count: passou, color: 'bg-brand-wine/10 text-brand-wine', icon: <Flame size={14} /> }
          ]
        };
      } else {
        const totalSpirits = filteredSpirits.reduce((acc, s) => acc + s.qty, 0);
        const evaluated = filteredSpirits.filter(s => s.score).length;
        const spiritsWithScore = filteredSpirits.filter(s => s.score);
        const avgScore = spiritsWithScore.length 
          ? Math.round(spiritsWithScore.reduce((acc, s) => acc + (s.score || 0), 0) / spiritsWithScore.length)
          : 0;

        const typeCounts: Record<string, number> = {};
        filteredSpirits.forEach(s => {
          typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
        });

        const countryCounts: Record<string, number> = {};
        filteredSpirits.forEach(s => {
          if (s.country) countryCounts[s.country] = (countryCounts[s.country] || 0) + 1;
        });

        let cheios = 0, meio = 0, vazios = 0;
        filteredSpirits.forEach(s => {
          if (s.level >= 80) cheios++;
          else if (s.level >= 30) meio++;
          else vazios++;
        });

        return {
          title: adegas.find(a => a.id === activeAdegaId)?.name || 'Minha Adega',
          isHistory: false,
          topCards: [
            { label: 'Spirits', value: totalSpirits },
            { label: 'Avaliados', value: evaluated },
            { label: 'Score Médio', value: avgScore }
          ],
          tables: [
            { title: 'POR TIPO', data: typeCounts, color: 'text-emerald-700' },
            { title: 'TOP PAÍSES', data: countryCounts, color: 'text-amber-800' }
          ],
          distribution: [
            { label: 'Cheios', count: cheios, color: 'text-emerald-600', dot: 'bg-emerald-500' },
            { label: 'Meio', count: meio, color: 'text-amber-600', dot: 'bg-amber-500' },
            { label: 'Quase vazios', count: vazios, color: 'text-brand-wine', dot: 'bg-brand-wine' }
          ]
        };
      }
    } else {
      // HISTORY REPORTS
      const last12Months: { label: string; month: number; year: number }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last12Months.push({
          label: d.toLocaleString('pt-BR', { month: 'short' }),
          month: d.getMonth(),
          year: d.getFullYear()
        });
      }

      const occasions: Record<string, number> = {};
      const mostConsumed: Record<string, { name: string, sub: string, count: number, extra?: string }> = {};

      if (mode === 'wines') {
        const totalCons = filteredCons.length;
        const totalBottles = filteredCons.reduce((acc, c) => acc + (c.qty || 1), 0);
        const consWithScore = filteredCons.filter(c => c.score);
        const avgScore = consWithScore.length 
          ? Math.round(consWithScore.reduce((acc, c) => acc + (c.score || 0), 0) / consWithScore.length)
          : 0;
        const uniqueWines = new Set(filteredCons.map(c => c.wineId)).size;

        const chartData = last12Months.map(m => {
          const count = filteredCons.filter(c => {
            const cd = new Date(c.date);
            return cd.getMonth() === m.month && cd.getFullYear() === m.year;
          }).reduce((acc, c) => acc + (c.qty || 1), 0);
          return { label: m.label, count };
        });

        filteredCons.forEach(c => {
          if (c.occasion) occasions[c.occasion] = (occasions[c.occasion] || 0) + (c.qty || 1);
          // Use snapshot as truth for history to avoid issues with deleted items
          const w = c.wineSnapshot || wines.find(x => x.id === c.wineId);
          if (w && w.id) {
            if (!mostConsumed[w.id]) mostConsumed[w.id] = { name: w.name || 'Vinho Desconhecido', sub: `${w.type || '-'} · ${w.country || '-'}`, count: 0 };
            mostConsumed[w.id].count += (c.qty || 1);
          }
        });

        const typeCounts: Record<string, number> = {};
        const countryCounts: Record<string, number> = {};
        filteredCons.forEach(c => {
          const w = c.wineSnapshot || wines.find(x => x.id === c.wineId);
          if (w) {
            const t = w.type || 'Outros';
            typeCounts[t] = (typeCounts[t] || 0) + (c.qty || 1);
            if (w.country) countryCounts[w.country] = (countryCounts[w.country] || 0) + (c.qty || 1);
          }
        });

        return {
          title: 'Histórico de vinhos',
          isHistory: true,
          topCards: [
            { label: 'Consumos', value: totalCons },
            { label: 'Garrafas', value: totalBottles },
            { label: 'Score Médio', value: avgScore },
            { label: 'Rótulos', value: uniqueWines }
          ],
          chart: { title: 'GARRAFAS POR MÊS', data: chartData, color: 'bg-brand-wine' },
          tables: [
            { title: 'POR TIPO', data: typeCounts, color: 'text-brand-wine' },
            { title: 'TOP PAÍSES', data: countryCounts, color: 'text-[#8B4513]' }
          ],
          occasions: { title: 'OCASIÕES', data: occasions },
          mostConsumed: Object.values(mostConsumed).sort((a,b) => b.count - a.count).slice(0, 5)
        };
      } else {
        const totalCons = filteredSpiritCons.length;
        const totalSpiritItems = new Set(filteredSpiritCons.map(c => c.spiritId)).size;
        const consWithScore = filteredSpiritCons.filter(c => c.score);
        const avgScore = consWithScore.length 
          ? Math.round(consWithScore.reduce((acc, c) => acc + (c.score || 0), 0) / consWithScore.length)
          : 0;
        
        const avgSessionDrop = filteredSpiritCons.length 
          ? Math.round(filteredSpiritCons.reduce((acc, c) => acc + (c.levelBefore - c.levelAfter), 0) / filteredSpiritCons.length)
          : 0;

        const chartData = last12Months.map(m => {
          const count = filteredSpiritCons.filter(c => {
            const cd = new Date(c.date);
            return cd.getMonth() === m.month && cd.getFullYear() === m.year;
          }).length;
          return { label: m.label, count };
        });

        filteredSpiritCons.forEach(c => {
          if (c.occasion) occasions[c.occasion] = (occasions[c.occasion] || 0) + 1;
          const s = c.spiritSnapshot || spirits.find(x => x.id === c.spiritId);
          if (s && s.id) {
            const drop = c.levelBefore - c.levelAfter;
            if (!mostConsumed[s.id]) mostConsumed[s.id] = { name: s.name || 'Spirit Desconhecido', sub: `${s.type || '-'} · ${s.country || '-'}`, count: 0, extra: `· -${drop}%` };
            mostConsumed[s.id].count += 1;
          }
        });

        const typeCounts: Record<string, number> = {};
        const countryCounts: Record<string, number> = {};
        filteredSpiritCons.forEach(c => {
          const s = c.spiritSnapshot || spirits.find(x => x.id === c.spiritId);
          if (s) {
            const t = s.type || 'Outros';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
            if (s.country) countryCounts[s.country] = (countryCounts[s.country] || 0) + 1;
          }
        });

        return {
          title: 'Histórico de spirits',
          isHistory: true,
          topCards: [
            { label: 'Sessões', value: totalCons },
            { label: 'Médio/Sessão', value: `${avgSessionDrop}%` },
            { label: 'Score Médio', value: avgScore },
            { label: 'Spirits', value: totalSpiritItems }
          ],
          chart: { title: 'SESSÕES POR MÊS', data: chartData, color: 'bg-amber-800' },
          tables: [
            { title: 'POR TIPO', data: typeCounts, color: 'text-amber-800' },
            { title: 'TOP PAÍSES', data: countryCounts, color: 'text-emerald-800' }
          ],
          occasions: { title: 'OCASIÕES', data: occasions },
          mostConsumed: Object.values(mostConsumed).sort((a,b) => b.count - a.count).slice(0, 5)
        };
      }
    }
  }, [wines, spirits, adegas, consumptions, spiritCons, view, mode, activeAdegaId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-[#faf7f2] border border-black/15 rounded-[40px] w-full max-w-lg max-h-[95vh] overflow-hidden shadow-old-lg flex flex-col"
      >
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between border-b border-black/5">
          <div className="flex items-center gap-3">
             <BarChartIcon />
             <h3 className="text-[26px] font-serif italic text-text-main leading-none">{stats.title}</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-cream-dark/50 hover:bg-cream-dark rounded-full transition-colors text-text-sub">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 min-h-0 font-sans">
          {/* Top Cards */}
          <div className="grid grid-cols-4 gap-3">
            {stats.topCards.map((card, i) => (
              <div key={i} className="p-3 bg-cream-dark/40 border border-black/5 rounded-2xl flex flex-col items-center justify-center text-center">
                 <div className="text-2xl font-serif italic text-text-main font-bold leading-none mb-1">{card.value}</div>
                 <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Chart Section */}
          {stats.chart && (
            <div className="p-6 bg-white border border-black/5 rounded-[28px] shadow-sm space-y-4">
              <h4 className="text-[11px] font-bold text-brand-wine uppercase tracking-[0.15em]">{stats.chart.title}</h4>
              <div className="h-28 flex items-end justify-between gap-1 mt-4">
                {stats.chart.data.map((d, i) => {
                  const max = Math.max(...stats.chart!.data.map(x => x.count)) || 1;
                  const h = (d.count / max) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                       <div className="w-full relative group">
                          <div 
                            className={`${stats.chart!.color} transition-all duration-500 rounded-sm w-full`} 
                            style={{ height: `${h}%`, minHeight: d.count > 0 ? '4px' : '2px', opacity: d.count > 0 ? 1 : 0.1 }}
                          />
                          {d.count > 0 && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                              {d.count}
                            </div>
                          )}
                       </div>
                       <span className="text-[8px] font-bold text-text-muted uppercase tracking-tighter w-full text-center truncate">{d.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tables Section */}
          <div className="grid grid-cols-2 gap-4">
            {stats.tables.map((table, i) => (
              <div key={i} className="p-5 bg-white border border-black/5 rounded-[28px] shadow-sm space-y-4">
                <h4 className={`text-[11px] font-bold ${table.color} uppercase tracking-[0.15em]`}>{table.title}</h4>
                <div className="space-y-3">
                  {Object.entries(table.data).sort((a,b) => (b[1] as number) - (a[1] as number)).slice(0, 5).map(([label, count]) => (
                    <div key={label} className="flex items-center justify-between group">
                       <span className="text-[13px] font-medium text-text-main truncate pr-2">{label}</span>
                       <div className="flex items-center gap-2">
                          <div className={`w-1 h-3 rounded-full opacity-10 bg-current transition-opacity group-hover:opacity-40`} />
                          <span className="text-[13px] font-semibold text-text-sub">{count as number}</span>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Special Bars (Maturity or Distribution) */}
          {stats.maturity && (
            <div className="p-6 bg-white border border-black/5 rounded-[28px] shadow-sm space-y-4">
              <h4 className="text-[11px] font-bold text-brand-wine uppercase tracking-[0.15em]">JANELAS DE GUARDA</h4>
              <div className="grid grid-cols-4 gap-2">
                {stats.maturity.map((m, i) => (
                  <div key={i} className={`${m.color} p-3 rounded-xl flex flex-col items-center justify-center text-center`}>
                    <div className="text-[18px] font-bold font-serif mb-1 leading-none">{m.count}</div>
                    <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-tight">
                      {m.icon}
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.distribution && (
             <div className="p-6 bg-white border border-black/5 rounded-[28px] shadow-sm space-y-4">
              <h4 className="text-[11px] font-bold text-amber-900 uppercase tracking-[0.15em]">DISTRIBUIÇÃO DE NÍVEIS</h4>
              <div className="grid grid-cols-3 gap-3">
                {stats.distribution.map((d, i) => (
                  <div key={i} className="bg-cream-dark/30 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                    <div className={`text-[20px] font-bold font-serif ${d.color} leading-none mb-1`}>{d.count}</div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-text-muted">
                      <div className={`w-2 h-2 rounded-full ${d.dot}`} />
                      {d.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Occasions / Grapes Section */}
          {stats.bars && (
             <div className="p-6 bg-white border border-black/5 rounded-[28px] shadow-sm space-y-5">
                <h4 className="text-[11px] font-bold text-text-sub uppercase tracking-[0.15em]">{stats.bars.title}</h4>
                <div className="space-y-4">
                  {Object.entries(stats.bars.data).sort((a,b) => (b[1] as number) - (a[1] as number)).slice(0, 5).map(([label, count]) => {
                    const max = Math.max(...Object.values(stats.bars!.data) as number[]) || 1;
                    return (
                      <div key={label} className="space-y-1.5">
                        <div className="flex justify-between text-[13px] font-medium text-text-main">
                          <span>{label}</span>
                          <span>{count as number}</span>
                        </div>
                        <div className="h-2 w-full bg-cream-dark rounded-full overflow-hidden">
                          <div className="h-full bg-brand-gold/60 rounded-full" style={{ width: `${((count as number) / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
             </div>
          )}

          {stats.occasions && (
             <div className="p-6 bg-white border border-black/5 rounded-[28px] shadow-sm space-y-5">
                <h4 className="text-[11px] font-bold text-brand-wine uppercase tracking-[0.15em]">{stats.occasions.title}</h4>
                <div className="space-y-4">
                  {Object.entries(stats.occasions.data).sort((a,b) => (b[1] as number) - (a[1] as number)).slice(0, 5).map(([label, count]) => {
                    const max = Math.max(...Object.values(stats.occasions!.data) as number[]) || 1;
                    return (
                      <div key={label} className="space-y-1.5">
                        <div className="flex justify-between text-[13px] font-medium text-text-main">
                          <span>{label}</span>
                          <span>{count as number}</span>
                        </div>
                        <div className="h-2 w-full bg-cream-dark rounded-full overflow-hidden">
                          <div className="h-full bg-brand-gold/60 rounded-full" style={{ width: `${((count as number) / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
             </div>
          )}

          {/* Most Consumed Section */}
          {stats.mostConsumed && (
             <div className="p-6 bg-white border border-black/5 rounded-[28px] shadow-sm space-y-5">
                <h4 className="text-[11px] font-bold text-brand-wine uppercase tracking-[0.15em]">MAIS CONSUMIDOS</h4>
                <div className="divide-y divide-black/5">
                  {stats.mostConsumed.map((item, i) => (
                    <div key={i} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                       <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-text-main leading-tight font-serif italic">{item.name}</span>
                          <span className="text-[10px] text-text-sub mt-0.5">{item.sub}</span>
                       </div>
                       <div className="bg-cream-dark/50 px-2 py-1 rounded-lg text-[10px] font-bold text-text-muted uppercase">
                         {item.count} {item.count === 1 ? (mode === 'wines' ? 'garrafa' : 'vez') : (mode === 'wines' ? 'garrafas' : 'vezes')} {item.extra}
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-transparent flex items-center justify-center">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-white border border-black/5 rounded-[20px] text-[16px] font-sans font-semibold text-text-main hover:bg-cream-dark active:scale-[0.98] transition-all shadow-sm"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
