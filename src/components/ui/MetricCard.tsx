import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from './Card';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: {
    value: number;
    isUpGood?: boolean;
    period?: string;
  };
  icon?: React.ReactNode;
  status?: 'healthy' | 'warning' | 'critical' | 'neutral';
  accentColor?: string;
  className?: string;
  progressBar?: number; // 0 - 100
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  trend,
  icon,
  status = 'neutral',
  className,
  progressBar,
}) => {
  // Black and White status border indicators
  const getStatusBorder = () => {
    switch (status) {
      case 'critical':
        return 'border-l-4 border-l-white';
      case 'warning':
        return 'border-l-4 border-l-zinc-500';
      case 'healthy':
        return 'border-l-4 border-l-zinc-300';
      default:
        return 'border-l-4 border-l-zinc-700';
    }
  };

  const getProgressColor = () => {
    if (progressBar === undefined) return '';
    if (progressBar > 85) return 'bg-white';
    if (progressBar > 70) return 'bg-zinc-400';
    return 'bg-zinc-600';
  };

  const renderTrend = () => {
    if (!trend) return null;
    const isZero = trend.value === 0;
    const isUp = trend.value > 0;

    return (
      <div className="flex items-center text-xs font-mono font-medium gap-0.5 text-zinc-300">
        {isZero ? (
          <Minus className="w-3 h-3" />
        ) : isUp ? (
          <ArrowUpRight className="w-3.5 h-3.5 text-white" />
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5 text-zinc-400" />
        )}
        <span>{Math.abs(trend.value)}%</span>
        {trend.period && <span className="text-zinc-500 text-[10px] ml-1">{trend.period}</span>}
      </div>
    );
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden group hover:border-zinc-600 transition-all duration-200',
        getStatusBorder(),
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-medium">
            {title}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono tracking-tight text-white">
              {value}
            </span>
            {unit && <span className="text-xs text-zinc-400 font-mono">{unit}</span>}
          </div>
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 group-hover:text-white transition-colors">
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend || progressBar !== undefined) && (
        <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            {subtitle && <span className="truncate">{subtitle}</span>}
            {renderTrend()}
          </div>

          {progressBar !== undefined && (
            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all duration-500', getProgressColor())}
                style={{ width: `${Math.min(100, Math.max(0, progressBar))}%` }}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
