import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ServiceHealthDistribution } from '../../types';

interface DonutHealthChartProps {
  data: ServiceHealthDistribution[];
  centerScore?: number;
  height?: number;
}

export const DonutHealthChart: React.FC<DonutHealthChartProps> = ({
  data,
  centerScore = 94.2,
  height = 200,
}) => {
  const monochromeColors = ['#FFFFFF', '#A1A1AA', '#3F3F46'];

  return (
    <div className="relative flex items-center justify-center" style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={75}
            paddingAngle={4}
            dataKey="count"
            stroke="#000000"
            strokeWidth={2}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={monochromeColors[index % monochromeColors.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }: any) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as ServiceHealthDistribution;
                return (
                  <div className="bg-black border border-zinc-700 px-3 py-2 rounded-xl text-xs font-mono shadow-xl">
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-zinc-400">
                      Services: <span className="text-white font-bold">{item.count}</span> ({item.percentage}%)
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold font-mono tracking-tight text-white">
          {centerScore}%
        </span>
        <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
          HEALTH
        </span>
      </div>
    </div>
  );
};
