import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  Download,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Clock,
  AlertTriangle,
  Flame,
  FileSpreadsheet,
} from 'lucide-react';
import { SystemReport } from '../types';
import { api } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { MetricCard } from '../components/ui/MetricCard';
import { RealtimeLineChart } from '../components/charts/RealtimeLineChart';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const ReportsPage: React.FC = () => {
  const [report, setReport] = useState<SystemReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const data = await api.getReports();
        setReport(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const handleExportCSV = () => {
    if (!report) return;

    // Build CSV content
    const rows = [
      ['Service Name', 'Availability SLA (%)', 'Total Incidents', 'Avg Latency (ms)'],
      ...report.serviceAvailability.map((s) => [
        s.service,
        `${s.uptimePercent}%`,
        s.incidents.toString(),
        `${s.avgLatencyMs} ms`,
      ]),
      [],
      ['Metric', 'Value'],
      ['Overall Uptime', `${report.overallUptimePercent}%`],
      ['Total Incidents', report.totalIncidents.toString()],
      ['MTTR (Mean Time to Resolution)', `${report.mttrMinutes} min`],
      ['MTTD (Mean Time to Detect)', `${report.mttdMinutes} min`],
      ['Total Alerts', report.totalAlerts.toString()],
      ['Generated At', report.generatedAt],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `APEX_SLA_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header with CSV Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-mono tracking-tight text-white flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-white" />
            REPORTS &amp; HISTORICAL ANALYTICS
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            SLA compliance, MTTR/MTTD efficiency benchmarks, and weekly availability rollups
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            PERIOD: {report?.period || 'November 2026'}
          </Badge>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-4 h-4" />}
            className="text-xs font-mono"
          >
            EXPORT AS CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <MetricCard
          title="Overall Uptime"
          value={report?.overallUptimePercent ?? 99.94}
          unit="%"
          status="healthy"
          icon={<CheckCircle2 className="w-4 h-4 text-white" />}
          subtitle="Target SLA: 99.90%"
        />

        <MetricCard
          title="MTTR (Resolution)"
          value={report?.mttrMinutes ?? 18.5}
          unit="min"
          trend={{ value: -22.4, isUpGood: false, period: 'vs last mo' }}
          icon={<Clock className="w-4 h-4" />}
          subtitle="Down from 23.8m"
        />

        <MetricCard
          title="MTTD (Detection)"
          value={report?.mttdMinutes ?? 3.2}
          unit="min"
          status="healthy"
          icon={<Clock className="w-4 h-4" />}
          subtitle="AI anomaly lead time"
        />

        <MetricCard
          title="Total Incidents"
          value={report?.totalIncidents ?? 14}
          unit="this mo"
          icon={<Flame className="w-4 h-4" />}
          subtitle="12 resolved within SLA"
        />

        <MetricCard
          title="Total Alerts"
          value={report?.totalAlerts ?? 186}
          unit="signals"
          icon={<AlertTriangle className="w-4 h-4" />}
          subtitle="84% auto-correlated"
        />
      </div>

      {/* Charts Row: Alert Frequency Distribution + Performance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Alert Frequency Distribution Bar Chart (Monochrome) */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                <AlertTriangle className="w-4 h-4 text-white" />
                Alert Frequency by Severity (Past 7 Days)
              </CardTitle>
              <CardDescription>Daily volume breakdown across severity categories</CardDescription>
            </div>
          </CardHeader>

          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report?.alertFrequency || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#52525B"
                  tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#52525B"
                  tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-black border border-zinc-700 p-2.5 rounded-xl text-xs font-mono shadow-xl">
                          <p className="text-zinc-400 mb-1 border-b border-zinc-800 pb-1">{label}</p>
                          {payload.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between gap-4 py-0.5">
                              <span className="text-zinc-300">{p.name}:</span>
                              <span className="font-bold text-white">{p.value} alerts</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Bar dataKey="critical" name="Critical" fill="#FFFFFF" radius={[3, 3, 0, 0]} />
                <Bar dataKey="warning" name="Warning" fill="#A1A1AA" radius={[3, 3, 0, 0]} />
                <Bar dataKey="info" name="Info" fill="#52525B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Weekly Performance Trends */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                <TrendingUp className="w-4 h-4 text-white" />
                Historical Performance Trends (Weekly)
              </CardTitle>
              <CardDescription>P99 Latency (ms) and Error Rate (%) evolution</CardDescription>
            </div>
          </CardHeader>

          <RealtimeLineChart
            data={report?.performanceTrends || []}
            xAxisKey="week"
            height={240}
            domain={[0, 420]}
            yAxisUnit="ms"
            series={[
              { key: 'p99LatencyMs', name: 'P99 Latency (ms)', strokeWidth: 2.2 },
              { key: 'avgLatencyMs', name: 'Avg Latency (ms)', strokeWidth: 2 },
            ]}
          />
        </Card>
      </div>

      {/* Service Availability Matrix */}
      <Card noPadding>
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
              Microservice Availability &amp; Outage Scorecard
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Exportable to CSV for executive reporting
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
                <th className="py-3 px-4 font-semibold uppercase">Microservice</th>
                <th className="py-3 px-4 font-semibold uppercase">Availability %</th>
                <th className="py-3 px-4 font-semibold uppercase">Incidents</th>
                <th className="py-3 px-4 font-semibold uppercase">Avg Latency</th>
                <th className="py-3 px-4 font-semibold uppercase text-right">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {report?.serviceAvailability.map((svc) => {
                const isCompliant = svc.uptimePercent >= 99.9;
                return (
                  <tr key={svc.service} className="hover:bg-zinc-900/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{svc.service}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-white">
                        {svc.uptimePercent}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{svc.incidents}</td>
                    <td className="py-3 px-4 text-zinc-300">{svc.avgLatencyMs} ms</td>
                    <td className="py-3 px-4 text-right">
                      <Badge variant={isCompliant ? 'healthy' : 'warning'}>
                        {isCompliant ? 'PASS' : 'DEVIATION'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
