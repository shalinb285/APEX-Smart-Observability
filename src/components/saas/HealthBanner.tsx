import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  WifiOff,
  Radio,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { healthScoring, HealthEvaluationResult, ProductHealthState, FreshnessState } from '../../services/healthScoring';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const HealthBanner: React.FC<{
  currentMetrics?: {
    cpu?: number;
    memory?: number;
    disk?: number;
    latency?: number;
    packetLoss?: number;
    failedLogins?: number;
  };
}> = ({ currentMetrics }) => {
  const [healthResult, setHealthResult] = useState<HealthEvaluationResult>(
    healthScoring.evaluateHealth(currentMetrics || {})
  );
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const res = healthScoring.evaluateHealth(currentMetrics || {});
      setHealthResult(res);
    }, 1500);
    return () => clearInterval(interval);
  }, [currentMetrics]);

  const stateColors: Record<ProductHealthState, { bg: string; text: string; border: string; icon: any }> = {
    EXCELLENT: {
      bg: 'bg-emerald-950/20',
      text: 'text-emerald-400',
      border: 'border-emerald-800/40',
      icon: CheckCircle2,
    },
    GOOD: {
      bg: 'bg-blue-950/20',
      text: 'text-blue-400',
      border: 'border-blue-800/40',
      icon: Activity,
    },
    FAIR: {
      bg: 'bg-amber-950/20',
      text: 'text-amber-400',
      border: 'border-amber-800/40',
      icon: AlertTriangle,
    },
    POOR: {
      bg: 'bg-rose-950/20',
      text: 'text-rose-400',
      border: 'border-rose-800/40',
      icon: AlertOctagon,
    },
  };

  const freshnessColors: Record<FreshnessState, { bg: string; text: string; border: string }> = {
    FRESH: { bg: 'bg-emerald-950/30', text: 'text-emerald-400', border: 'border-emerald-700/50' },
    STALE: { bg: 'bg-amber-950/30', text: 'text-amber-400', border: 'border-amber-700/50' },
    OFFLINE: { bg: 'bg-rose-950/30', text: 'text-rose-400', border: 'border-rose-700/50' },
  };

  const currentTheme = stateColors[healthResult.state];
  const freshTheme = freshnessColors[healthResult.freshness];
  const StateIcon = currentTheme.icon;

  return (
    <div className={`rounded-xl border ${currentTheme.border} ${currentTheme.bg} p-3 transition-all`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Health State & Triggering reason */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-black/60 border ${currentTheme.border} ${currentTheme.text} shrink-0`}>
            <StateIcon className="w-5 h-5" />
          </div>

          <div className="space-y-0.5 font-mono">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 uppercase font-semibold">PRODUCT HEALTH STATE:</span>
              <span className={`text-sm font-bold tracking-wide ${currentTheme.text}`}>
                {healthResult.state} ({healthResult.score}/100)
              </span>

              {/* Freshness Badge */}
              <span
                className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold border ${freshTheme.border} ${freshTheme.bg} ${freshTheme.text}`}
              >
                {healthResult.freshness} ({healthResult.secondsSinceLastUpdate}s)
              </span>
            </div>

            <p className="text-xs text-zinc-300 font-mono">
              <span className="text-zinc-500">Trigger:</span> {healthResult.reason}{' '}
              <span className="text-zinc-400">
                [{healthResult.triggeringMetric}: {healthResult.triggeringValue} vs {healthResult.triggeringThreshold}]
              </span>
            </p>
          </div>
        </div>

        {/* Right: Timestamps & Expand Details */}
        <div className="flex items-center gap-3 font-mono text-xs shrink-0">
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-[10px] text-zinc-500">
              LATEST EVENT: {healthResult.latestEventTimestampUtc.split('T')[1].replace('Z', '')} UTC
            </span>
            <span className="text-[10px] text-zinc-500">
              LAST UPDATE: {healthResult.lastSuccessfulUpdateUtc.split('T')[1].replace('Z', '')} UTC
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-black/40 hover:bg-black/70 border border-zinc-800 text-zinc-300 text-xs"
          >
            <span>{isExpanded ? 'Hide' : 'Inspect'} Thresholds</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Threshold & Metric Inspector */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-black/40 border border-zinc-850">
            <span className="text-zinc-500 text-[10px] block">CPU UTIL</span>
            <span
              className={`font-bold ${
                healthResult.detailedMetrics.cpu.status === 'critical'
                  ? 'text-rose-400'
                  : healthResult.detailedMetrics.cpu.status === 'warning'
                  ? 'text-amber-400'
                  : 'text-white'
              }`}
            >
              {healthResult.detailedMetrics.cpu.value.toFixed(1)}%
            </span>
            <span className="text-[9px] text-zinc-500 block">Crit &gt; 90%</span>
          </div>

          <div className="p-2 rounded bg-black/40 border border-zinc-850">
            <span className="text-zinc-500 text-[10px] block">MEMORY UTIL</span>
            <span
              className={`font-bold ${
                healthResult.detailedMetrics.memory.status === 'critical'
                  ? 'text-rose-400'
                  : healthResult.detailedMetrics.memory.status === 'warning'
                  ? 'text-amber-400'
                  : 'text-white'
              }`}
            >
              {healthResult.detailedMetrics.memory.value.toFixed(1)}%
            </span>
            <span className="text-[9px] text-zinc-500 block">Crit &gt; 92%</span>
          </div>

          <div className="p-2 rounded bg-black/40 border border-zinc-850">
            <span className="text-zinc-500 text-[10px] block">DISK UTIL</span>
            <span
              className={`font-bold ${
                healthResult.detailedMetrics.disk.status === 'critical'
                  ? 'text-rose-400'
                  : healthResult.detailedMetrics.disk.status === 'warning'
                  ? 'text-amber-400'
                  : 'text-white'
              }`}
            >
              {healthResult.detailedMetrics.disk.value.toFixed(1)}%
            </span>
            <span className="text-[9px] text-zinc-500 block">Crit &gt; 90%</span>
          </div>

          <div className="p-2 rounded bg-black/40 border border-zinc-850">
            <span className="text-zinc-500 text-[10px] block">P95 LATENCY</span>
            <span
              className={`font-bold ${
                healthResult.detailedMetrics.latency.status === 'critical'
                  ? 'text-rose-400'
                  : healthResult.detailedMetrics.latency.status === 'warning'
                  ? 'text-amber-400'
                  : 'text-white'
              }`}
            >
              {healthResult.detailedMetrics.latency.value.toFixed(1)} ms
            </span>
            <span className="text-[9px] text-zinc-500 block">Crit &gt; 400ms</span>
          </div>

          <div className="p-2 rounded bg-black/40 border border-zinc-850">
            <span className="text-zinc-500 text-[10px] block">PACKET LOSS</span>
            <span
              className={`font-bold ${
                healthResult.detailedMetrics.packetLoss.status === 'critical'
                  ? 'text-rose-400'
                  : healthResult.detailedMetrics.packetLoss.status === 'warning'
                  ? 'text-amber-400'
                  : 'text-white'
              }`}
            >
              {healthResult.detailedMetrics.packetLoss.value.toFixed(2)}%
            </span>
            <span className="text-[9px] text-zinc-500 block">Crit &gt; 3.0%</span>
          </div>

          <div className="p-2 rounded bg-black/40 border border-zinc-850">
            <span className="text-zinc-500 text-[10px] block">FAILED LOGINS</span>
            <span
              className={`font-bold ${
                healthResult.detailedMetrics.failedLogins.status === 'critical'
                  ? 'text-rose-400'
                  : healthResult.detailedMetrics.failedLogins.status === 'warning'
                  ? 'text-amber-400'
                  : 'text-white'
              }`}
            >
              {healthResult.detailedMetrics.failedLogins.value}
            </span>
            <span className="text-[9px] text-zinc-500 block">Burst &gt; 25</span>
          </div>
        </div>
      )}
    </div>
  );
};
