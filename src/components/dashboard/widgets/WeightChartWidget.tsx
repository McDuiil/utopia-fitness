import React, { useMemo, memo, useState, useEffect, useRef } from "react";
import { Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import GlassCard from "../../GlassCard";
import { AppData, DayData } from "../../../types";

interface WeightChartWidgetProps {
  appData: AppData;
  t: (key: string) => string;
  language: string;
}

const WeightChartWidget = memo(({ appData, t, language }: WeightChartWidgetProps) => {
  const [isInView, setIsInView] = useState(false);
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('7d');
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy rendering
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const chartData = useMemo(() => {
    let rawData = Object.entries(appData.days)
      .filter(([_, data]) => (data as DayData).weight !== undefined || (data as DayData).bodyFat !== undefined)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date: date.split('-').slice(1).join('/'),
        weight: (data as DayData).weight,
        bodyFat: (data as DayData).bodyFat,
        rawDate: date
      }));

    if (rawData.length === 0) {
      return [{ date: 'N/A', weight: appData.profile.weight, bodyFat: appData.profile.bodyFat }];
    }

    // Filter by range
    if (range === '7d') {
      rawData = rawData.slice(-7);
    } else if (range === '30d') {
      rawData = rawData.slice(-30);
    }

    // Downsampling algorithm (keeping peaks)
    const MAX_POINTS = 30;
    if (rawData.length <= MAX_POINTS) return rawData;

    const sampled: typeof rawData = [];
    const step = Math.ceil(rawData.length / MAX_POINTS);

    for (let i = 0; i < rawData.length; i += step) {
      const chunk = rawData.slice(i, i + step);
      let minWeightIdx = 0;
      let maxWeightIdx = 0;
      for (let j = 1; j < chunk.length; j++) {
        if ((chunk[j].weight || 0) < (chunk[minWeightIdx].weight || 0)) minWeightIdx = j;
        if ((chunk[j].weight || 0) > (chunk[maxWeightIdx].weight || 0)) maxWeightIdx = j;
      }
      sampled.push(chunk[maxWeightIdx]);
      if (minWeightIdx !== maxWeightIdx && sampled.length < MAX_POINTS) {
        sampled.push(chunk[minWeightIdx]);
      }
    }

    return sampled.sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  }, [appData.days, appData.profile.weight, appData.profile.bodyFat, range]);

  return (
    <motion.div
      ref={containerRef}
      layout
      style={{ willChange: 'transform, opacity' }}
      className="col-span-2"
    >
      <GlassCard className="h-[340px] flex flex-col p-6 overflow-hidden relative">
        <div className="mb-6 flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-purple-400">
            <Activity size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{t("weightTrend")}</span>
          </div>
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {(['7d', '30d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${
                  range === r ? "bg-purple-500 text-white" : "text-white/40 hover:text-white/60"
                }`}
              >
                {r === 'all' ? t('all') || 'All' : r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 w-full relative">
          <AnimatePresence mode="wait">
            {!isInView ? (
              <motion.div 
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col gap-4"
              >
                <div className="flex-1 w-full rounded-2xl bg-white/[0.02] animate-pulse" />
                <div className="h-4 w-full flex justify-between px-2">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-2 w-8 rounded bg-white/[0.05]" />)}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="chart"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
                style={{ touchAction: 'pan-y' }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorBodyFat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }}
                    />
                    <YAxis 
                      yId="left"
                      orientation="left"
                      domain={['dataMin - 0.5', 'dataMax + 0.5']}
                      tick={{ fill: 'rgba(168, 85, 247, 0.2)', fontSize: 8 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      yId="right"
                      orientation="right"
                      tick={{ fill: 'rgba(236, 72, 153, 0.2)', fontSize: 8 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                      itemStyle={{ color: '#fff', fontSize: '11px' }}
                      labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginBottom: '4px' }}
                      cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                    />
                    <Area 
                      yId="left"
                      type="monotone" 
                      dataKey="weight" 
                      name={t('weight')}
                      stroke="#a855f7" 
                      fillOpacity={1} 
                      fill="url(#colorWeight)" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0, fill: '#a855f7' }}
                      animationDuration={800}
                    />
                    <Area 
                      yId="right"
                      type="monotone" 
                      dataKey="bodyFat" 
                      name={t('bodyFat')}
                      stroke="#ec4899" 
                      fillOpacity={1} 
                      fill="url(#colorBodyFat)" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0, fill: '#ec4899' }}
                      animationDuration={800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>
    </motion.div>
  );
}, (prev, next) => {
  const p = Object.keys(prev.appData.days);
  const n = Object.keys(next.appData.days);
  
  // Strict comparison for chart re-render
  if (p.length !== n.length) return false;
  if (prev.language !== next.language) return false;
  
  // Check last data point
  const lastP = p.sort().reverse()[0];
  const lastN = n.sort().reverse()[0];
  if (lastP !== lastN) return false;
  
  const dayP = prev.appData.days[lastP];
  const dayN = next.appData.days[lastN];
  return dayP.weight === dayN.weight && dayP.bodyFat === dayN.bodyFat;
});

WeightChartWidget.displayName = "WeightChartWidget";

export default WeightChartWidget;
