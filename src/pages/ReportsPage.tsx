import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileBarChart,
  Download,
  CheckCircle2,
  TrendingUp,
  Clock,
  AlertTriangle,
  Flame,
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

type ReportData = Partial<SystemReport> & {
  serviceAvailability?: unknown;
  alertFrequency?: unknown;
  performanceTrends?: unknown;
};

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);

const csvCell = (value: unknown): string => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

export const ReportsPage: React.FC = () => {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response: unknown = await api.getReports();

      // Some API responses wrap the report in { data: ... } or { report: ... }.
      // Normalize those shapes and reject non-object responses safely.
      let candidate: any = response;
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        candidate = candidate.report ?? candidate.data ?? candidate;
      }

      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
        throw new Error('The reports API returned an unexpected response format.');
      }

      setReport({
        ...candidate,
        serviceAvailability: asArray(candidate.serviceAvailability),
        alertFrequency: asArray(candidate.alertFrequency),
        performanceTrends: asArray(candidate.performanceTrends),
      });
    } catch (err: any) {
      console.error('Failed to load APEX reports:', err);
      setReport(null);
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'Unable to load reports from the backend.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const serviceAvailability = useMemo(
    () => asArray<any>(report?.serviceAvailability),
    [report]
  );
  const alertFrequency = useMemo(
    () => asArray<any>(report?.alertFrequency),
    [report]
  );
  const performanceTrends = useMemo(
    () => asArray<any>(report?.performanceTrends),
    [report]
  );

  const handleExportCSV = () => {
    if (!report) return;

    const rows: unknown[][] = [
      ['Service Name', 'Availability SLA (%)', 'Total Incidents', 'Avg Latency (ms)'],
      ...serviceAvailability.map((service: any) => [
        service?.service ?? '',
        `${service?.uptimePercent ?? ''}%`,
        service?.incidents ?? 0,
        service?.avgLatencyMs ?? '',
      ]),
      [],
      ['Metric', 'Value'],
      ['Overall Uptime', `${report.overallUptimePercent ?? ''}%`],
      ['Total Incidents', report.totalIncidents ?? 0],
      ['MTTR (Mean Time to Resolution)', `${report.mttrMinutes ?? ''} min`],
      ['MTTD (Mean Time to Detect)', `${report.mttdMinutes ?? ''} min`],
      ['Total Alerts', report.totalAlerts ?? 0],
      ['Generated At', report.generatedAt ?? ''],
    ];

    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `APEX_SLA_Report_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
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
            PERIOD: {report?.period || 'Latest'}
          </Badge>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-4 h-4" />}
            className="text-xs font-mono"
            disabled={!report || loading}
          >
            EXPORT AS CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => void fetchReport()} disabled={loading}>
            {loading ? 'LOADING...' : 'REFRESH'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-700/50 bg-amber-950/20 p-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Report data unavailable</p>
            <p className="mt-1 text-xs text-amber-200/80">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <MetricCard
          title="Overall Uptime"
          value={report?.overallUptimePercent ?? 0}
          unit="%"
          status={report?.overallUptimePercent != null && report.overallUptimePercent >= 99.9 ? 'healthy' : undefined}
          icon={<CheckCircle2 className="w-4 h-4 text-white" />}
          subtitle="Target SLA: 99.90%"
        />
        <MetricCard
          title="MTTR (Resolution)"
          value={report?.mttrMinutes ?? 0}
          unit="min"
          icon={<Clock className="w-4 h-4" />}
          subtitle="Mean time to resolution"
        />
        <MetricCard
          title="MTTD (Detection)"
          value={report?.mttdMinutes ?? 0}
          unit="min"
          icon={<Clock className="w-4 h-4" />}
          subtitle="Mean time to detect"
        />
        <MetricCard
          title="Total Incidents"
          value={report?.totalIncidents ?? 0}
          unit="this period"
          icon={<Flame className="w-4 h-4" />}
          subtitle="Reported incidents"
        />
        <MetricCard
          title="Total Alerts"
          value={report?.totalAlerts ?? 0}
          unit="signals"
          icon={<AlertTriangle className="w-4 h-4" />}
          subtitle="Reported alerts"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            {alertFrequency.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alertFrequency} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                  <XAxis dataKey="date" stroke="#52525B" tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'monospace' }} tickLine={false} />
                  <YAxis stroke="#52525B" tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'monospace' }} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !Array.isArray(payload) || payload.length === 0) return null;
                      return (
                        <div className="bg-black border border-zinc-700 p-2.5 rounded-xl text-xs font-mono shadow-xl">
                          <p className="text-zinc-400 mb-1 border-b border-zinc-800 pb-1">{label}</p>
                          {payload.map((item: any, index: number) => (
                            <div key={`${item?.name ?? 'series'}-${index}`} className="flex justify-between gap-4 py-0.5">
                              <span className="text-zinc-300">{item?.name ?? 'Alerts'}:</span>
                              <span className="font-bold text-white">{item?.value ?? 0} alerts</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Bar dataKey="critical" name="Critical" fill="#FFFFFF" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="warning" name="Warning" fill="#A1A1AA" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="info" name="Info" fill="#52525B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-zinc-500">
                {loading ? 'LOADING ALERT HISTORY...' : 'NO ALERT HISTORY AVAILABLE'}
              </div>
            )}
          </div>
        </Card>

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

          {performanceTrends.length > 0 ? (
            <RealtimeLineChart
              data={performanceTrends}
              xAxisKey="week"
              height={240}
              domain={[0, 420]}
              yAxisUnit="ms"
              series={[
                { key: 'p99LatencyMs', name: 'P99 Latency (ms)', strokeWidth: 2.2 },
                { key: 'avgLatencyMs', name: 'Avg Latency (ms)', strokeWidth: 2 },
              ]}
            />
          ) : (
            <div className="h-[240px] flex items-center justify-center text-xs font-mono text-zinc-500">
              {loading ? 'LOADING PERFORMANCE HISTORY...' : 'NO PERFORMANCE HISTORY AVAILABLE'}
            </div>
          )}
        </Card>
      </div>

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
              {serviceAvailability.map((service: any, index: number) => {
                const uptime = Number(service?.uptimePercent);
                const isCompliant = Number.isFinite(uptime) && uptime >= 99.9;
                const name = service?.service || `Service ${index + 1}`;
                return (
                  <tr key={`${name}-${index}`} className="hover:bg-zinc-900/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{name}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-white">
                        {Number.isFinite(uptime) ? `${uptime}%` : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{service?.incidents ?? '—'}</td>
                    <td className="py-3 px-4 text-zinc-300">
                      {service?.avgLatencyMs != null ? `${service.avgLatencyMs} ms` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge variant={isCompliant ? 'healthy' : 'warning'}>
                        {isCompliant ? 'PASS' : 'DEVIATION'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {!loading && serviceAvailability.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-zinc-500">
                    No service availability records returned by the API.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ReportsPage;
