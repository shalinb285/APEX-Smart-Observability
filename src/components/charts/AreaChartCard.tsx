import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface AreaSeries {
  key: string;
  name: string;
  color?: string;
}

interface AreaChartCardProps {
  data: any[];
  series: AreaSeries[];
  xAxisKey?: string;
  height?: number;
  unit?: string;
}

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black border border-zinc-700 px-3 py-2 rounded-xl text-xs font-mono shadow-xl">
        <p className="text-zinc-400 mb-1 pb-1 border-b border-zinc-800">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-white" />
              {entry.name}:
            </span>
            <span className="font-semibold text-white">
              {entry.value} {unit || ''}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const AreaChartCard: React.FC<AreaChartCardProps> = ({
  data,
  series,
  xAxisKey = 'timestamp',
  height = 200,
  unit = '',
}) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-mono" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
          <XAxis
            dataKey={xAxisKey}
            stroke="#52525B"
            tick={{ fill: '#A1A1AA', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#27272A' }}
          />
          <YAxis
            stroke="#52525B"
            tick={{ fill: '#A1A1AA', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            unit={unit}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke="#FFFFFF"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#grad-mono)"
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
