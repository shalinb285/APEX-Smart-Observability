import React, { useState, useEffect } from 'react';
import {
  Activity,
  Clock,
  Zap,
  TrendingDown,
  Layers,
  Database,
  AlertTriangle,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { APMMetrics } from '../types';
import { api } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusPill } from '../components/ui/StatusPill';
import { MetricCard } from '../components/ui/MetricCard';
import { RealtimeLineChart } from '../components/charts/RealtimeLineChart';
import { AreaChartCard } from '../components/charts/AreaChartCard';
import { generateTimeSeriesMetrics } from '../services/mockData';

export const APMPage: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'15m' | '1h' | '6h' | '24h' | '7d'>('1h');
  const [apm, setApm] = useState<APMMetrics | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadApm = async () => {
      setLoading(true);
      try {
        const data = await api.getAPMMetrics(timeFilter);
        setApm(data);

        // Adjust data point count based on time filter
        const points = timeFilter === '15m' ? 15 : timeFilter === '1h' ? 30 : 45;
        setChartData(generateTimeSeriesMetrics(points));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadApm();
  }, [timeFilter]);

  const timeFilterOptions = [
    { id: '15m', label: 'Last 15m' },
    { id: '1h', label: 'Last 1 hour' },
    { id: '6h', label: 'Last 6 hours' },
    { id: '24h', label: 'Last 24 hours' },
    { id: '7d', label: 'Last 7 days' },
  ];

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'GET':
        return <Badge variant="outline">GET</Badge>;
      case 'POST':
        return <Badge variant="critical">POST</Badge>;
      case 'PUT':
      case 'PATCH':
        return <Badge variant="default">PUT</Badge>;
      case 'DELETE':
        return <Badge variant="critical">DEL</Badge>;
      default:
        return <Badge>{method}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Time Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-mono tracking-tight text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-white" />
            APPLICATION PERFORMANCE MONITORING (APM)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time throughput, endpoint latencies, and transaction profiling
          </p>
        </div>

        {/* Time Filters */}
        <div className="flex items-center gap-1 bg-black p-1 rounded-xl border border-zinc-800 text-xs font-mono">
          {timeFilterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTimeFilter(opt.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeFilter === opt.id
                  ? 'bg-zinc-800 text-white shadow-sm font-semibold border border-zinc-700'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* APM KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <MetricCard
          title="Avg Response Time"
          value={apm?.responseTimeMs ?? 84.6}
          unit="ms"
          icon={<Clock className="w-4 h-4" />}
          trend={{ value: 3.8, isUpGood: false, period: `vs prev ${timeFilter}` }}
          status="healthy"
          subtitle="Apdex score: 0.96 (Excellent)"
        />

        <MetricCard
          title="Requests Per Second"
          value={apm?.requestsPerSecond ?? 5240}
          unit="req/s"
          icon={<Zap className="w-4 h-4" />}
          trend={{ value: 14.2, isUpGood: true, period: `vs prev ${timeFilter}` }}
          subtitle="Peak: 6,800 req/s"
        />

        <MetricCard
          title="Error Rate"
          value={apm?.errorRatePercent ?? 0.42}
          unit="%"
          icon={<TrendingDown className="w-4 h-4" />}
          status={apm && apm.errorRatePercent > 1 ? 'critical' : 'healthy'}
          trend={{ value: -8.1, isUpGood: false, period: `vs prev ${timeFilter}` }}
          subtitle="4xx: 0.24% | 5xx: 0.18%"
        />

        <MetricCard
          title="Network Throughput"
          value={apm?.throughputMb ?? 342.8}
          unit="MB/s"
          icon={<Activity className="w-4 h-4" />}
          subtitle="2.74 Gbps aggregated bandwidth"
        />

        <MetricCard
          title="Application Health"
          value="99.92"
          unit="%"
          icon={<CheckCircle2 className="w-4 h-4 text-white" />}
          status="healthy"
          subtitle="0 SLA breaches in period"
        />
      </div>

      {/* APM Interactive Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time & Error Rate Trends */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                <Clock className="w-4 h-4 text-white" />
                Response Time (ms) &amp; Error Rate (%)
              </CardTitle>
              <CardDescription>Correlated latency vs HTTP exception frequency</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {timeFilter.toUpperCase()} WINDOW
            </Badge>
          </CardHeader>

          <RealtimeLineChart
            data={chartData}
            height={240}
            domain={[0, 150]}
            yAxisUnit="ms"
            series={[
              { key: 'responseTime', name: 'Avg Latency (ms)', strokeWidth: 2.2 },
              { key: 'errorRate', name: 'Error Rate (%)', strokeWidth: 2 },
            ]}
          />
        </Card>

        {/* Throughput & Requests per second Area Chart */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                <Zap className="w-4 h-4 text-white" />
                Throughput &amp; Request Velocity (RPS)
              </CardTitle>
              <CardDescription>Aggregated inbound HTTP transactions</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px]">
              TRAFFIC
            </Badge>
          </CardHeader>

          <AreaChartCard
            data={chartData}
            height={240}
            unit=" rps"
            series={[{ key: 'rps', name: 'Requests/sec' }]}
          />
        </Card>
      </div>

      {/* API Endpoint Performance Table */}
      <Card noPadding>
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-300" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
              API Endpoint Performance Matrix
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">P95 &amp; P99 latency percentiles</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
                <th className="py-3 px-4 font-semibold uppercase">Method</th>
                <th className="py-3 px-4 font-semibold uppercase">Endpoint Path</th>
                <th className="py-3 px-4 font-semibold uppercase">Avg Latency</th>
                <th className="py-3 px-4 font-semibold uppercase">P95 Latency</th>
                <th className="py-3 px-4 font-semibold uppercase">P99 Latency</th>
                <th className="py-3 px-4 font-semibold uppercase">RPS</th>
                <th className="py-3 px-4 font-semibold uppercase">Error %</th>
                <th className="py-3 px-4 font-semibold uppercase text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {apm?.endpoints.map((ep) => (
                <tr key={ep.path} className="hover:bg-zinc-900/60 transition-colors">
                  <td className="py-3 px-4">{getMethodBadge(ep.method)}</td>
                  <td className="py-3 px-4 font-semibold text-white">{ep.path}</td>
                  <td className="py-3 px-4 text-zinc-200">{ep.avgResponseTimeMs} ms</td>
                  <td className="py-3 px-4 text-zinc-300">{ep.p95ResponseTimeMs} ms</td>
                  <td className="py-3 px-4 font-semibold text-white">{ep.p99ResponseTimeMs} ms</td>
                  <td className="py-3 px-4 text-zinc-300">{ep.rps} /s</td>
                  <td className="py-3 px-4">
                    <span className={ep.errorRate > 1.5 ? 'text-white font-bold underline' : 'text-zinc-300'}>
                      {ep.errorRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <StatusPill status={ep.status} className="text-[10px]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Slow Transactions Profiler */}
      <Card noPadding>
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-300" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
              Slow Transaction Traces (Degraded Queries)
            </h3>
          </div>
          <Badge variant="outline" className="text-[10px]">
            THRESHOLD &gt; 800MS
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
                <th className="py-3 px-4 font-semibold uppercase">Tx ID</th>
                <th className="py-3 px-4 font-semibold uppercase">Endpoint</th>
                <th className="py-3 px-4 font-semibold uppercase">Duration</th>
                <th className="py-3 px-4 font-semibold uppercase">Service</th>
                <th className="py-3 px-4 font-semibold uppercase">DB Queries</th>
                <th className="py-3 px-4 font-semibold uppercase">Timestamp</th>
                <th className="py-3 px-4 font-semibold uppercase text-right">Exit State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {apm?.slowTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-zinc-900/60 transition-colors">
                  <td className="py-3 px-4 text-zinc-300 font-semibold">{tx.id}</td>
                  <td className="py-3 px-4 text-white font-medium">{tx.endpoint}</td>
                  <td className="py-3 px-4 text-white font-bold">{tx.durationMs} ms</td>
                  <td className="py-3 px-4 text-zinc-300">{tx.service}</td>
                  <td className="py-3 px-4 text-zinc-300">
                    <span className="flex items-center gap-1">
                      <Database className="w-3 h-3 text-zinc-400" />
                      {tx.dbQueriesCount} calls
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-400">{tx.timestamp}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-white border border-zinc-700">
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
