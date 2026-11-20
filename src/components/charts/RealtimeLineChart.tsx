import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface LineSeriesConfig {
  key: string;
  name: string;
  color?: string;
  strokeWidth?: number;
  dot?: boolean;
}

interface RealtimeLineChartProps {
  data: any[];
  series: LineSeriesConfig[];
  xAxisKey?: string;
  height?: number;
  yAxisUnit?: string;
  domain?: [number | string, number | string];
}

const CustomTooltip = ({ active, payload, label, yAxisUnit }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black border border-zinc-700 px-3.5 py-2.5 rounded-xl shadow-2xl text-xs font-mono">
        <p className="text-zinc-400 mb-1.5 pb-1 border-b border-zinc-800">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || '#FFFFFF' }} />
                {entry.name}:
              </span>
              <span className="font-semibold text-white">
                {entry.value} {yAxisUnit || ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const RealtimeLineChart: React.FC<RealtimeLineChartProps> = ({
  data,
  series,
  xAxisKey = 'timestamp',
  height = 240,
  yAxisUnit = '%',
  domain = [0, 100],
}) => {
  // Monochrome color rotation for series
  const monochromePalette = ['#FFFFFF', '#A1A1AA', '#71717A', '#E4E4E7'];

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
          <XAxis
            dataKey={xAxisKey}
            stroke="#52525B"
            tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#27272A' }}
          />
          <YAxis
            stroke="#52525B"
            domain={domain}
            tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            unit={yAxisUnit}
          />
          <Tooltip content={<CustomTooltip yAxisUnit={yAxisUnit} />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }}
            formatter={(value) => <span className="text-zinc-300 mr-2">{value}</span>}
          />
          {series.map((s, idx) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={monochromePalette[idx % monochromePalette.length]}
              strokeWidth={s.strokeWidth || 2}
              dot={s.dot ?? false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
