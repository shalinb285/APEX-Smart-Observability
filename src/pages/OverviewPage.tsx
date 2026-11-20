import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Server,
  AlertTriangle,
  Flame,
  Cpu,
  HardDrive,
  Wifi,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useMonitoring } from '../context/MonitoringContext';
import { MetricCard } from '../components/ui/MetricCard';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusPill } from '../components/ui/StatusPill';
import { RealtimeLineChart } from '../components/charts/RealtimeLineChart';
import { DonutHealthChart } from '../components/charts/DonutHealthChart';
import { HealthBanner } from '../components/saas/HealthBanner';
import { mockServiceHealthDistribution, mockIncidents, mockAlerts } from '../services/mockData';
import { healthScoring } from '../services/healthScoring';  
import { IncidentItem, AlertItem } from '../types';

export const OverviewPage: React.FC = () => {

  const navigate = useNavigate();
  const { overview, metricsHistory, latestMetric, isLiveStreaming } = useMonitoring();
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    setIncidents(mockIncidents.slice(0, 3));
    setAlerts(mockAlerts.slice(0, 4));
  }, []);

const cpuVal = latestMetric ? latestMetric.cpu : (overview?.cpuUtilization ?? 68.4);
const memVal = latestMetric ? latestMetric.memory : (overview?.memoryUtilization ?? 74.1);
const diskVal = overview?.diskUtilization ?? 61.8;
const latencyVal = latestMetric?.responseTime ?? (overview?.responseTimeMs ?? 84.6);
const errorVal = latestMetric?.errorRate ?? (overview?.errorRatePercent ?? 0.42);

const healthScore = healthScoring.evaluateHealth({
    cpu: cpuVal,
    memory: memVal,
    disk: diskVal,
    latency: latencyVal,
    timestamp: overview?.timestamp ?? latestMetric?.timestamp,
}).score;
  return (
    <div className="space-y-6">
      {/* 4-State Product Health & Operational Freshness Engine */}
      <HealthBanner currentMetrics={{ cpu: cpuVal, memory: memVal, disk: diskVal, latency: latencyVal }} />

      {/* Top AI Summary Banner */}
      <Card variant="gradient" className="border-zinc-800 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-300 font-semibold">
                  APEX AI // SYSTEM HEALTH DIAGNOSTIC
                </span>
                <StatusPill status={overview?.status || 'warning'} />
                {isLiveStreaming && (
                  <Badge variant="outline" dot className="text-[10px]">
                    REAL-TIME SYNC
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans max-w-4xl">
                {overview?.aiHealthSummary ||
                  'Autonomous telemetry analysis indicates moderate memory pressure on payment-gateway cluster (pod-04) following recent deployment v2.4.1. Core checkout pipeline is stable with 99.8% availability. 3 anomalies currently monitored; zero SLA breaches detected.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/ai-intelligence')}
              className="text-xs font-mono"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              INVESTIGATE AI RCA
            </Button>
          </div>
        </div>
      </Card>

      {/* Primary KPI Grid (10 central metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <MetricCard
  title="System Health"
  value={healthScore === null ? 'N/A' : healthScore.toFixed(1)}
  unit={healthScore === null ? '' : '%'}
  status={
    healthScore === null
      ? 'warning'
      : healthScore > 90
        ? 'healthy'
        : healthScore > 75
          ? 'warning'
          : 'critical'
  }
  icon={<ShieldCheck className="w-4 h-4" />}
  subtitle={
    healthScore === null
      ? 'Numeric health score unavailable'
      : 'SLA Target 99.9%'
  }
  progressBar={healthScore ?? 0}
/>

        <MetricCard
          title="Monitored Services"
          value={overview?.monitoredServices ?? 48}
          unit="active"
          icon={<Server className="w-4 h-4" />}
          subtitle="4 clusters across 3 regions"
        />

        <MetricCard
          title="Active Incidents"
          value={overview?.activeIncidents ?? 2}
          unit="open"
          status={overview?.activeIncidents && overview.activeIncidents > 0 ? 'critical' : 'healthy'}
          icon={<Flame className="w-4 h-4" />}
          subtitle="1 P1 Critical in US-East"
        />

        <MetricCard
          title="Critical Alerts"
          value={overview?.criticalAlerts ?? 3}
          unit="firing"
          status={overview?.criticalAlerts && overview.criticalAlerts > 0 ? 'critical' : 'healthy'}
          icon={<AlertTriangle className="w-4 h-4" />}
          subtitle="2 acknowledged"
        />

        <MetricCard
          title="API Response Time"
          value={latencyVal}
          unit="ms"
          trend={{ value: 4.2, isUpGood: false, period: 'vs 1h ago' }}
          icon={<Clock className="w-4 h-4" />}
          subtitle="P95: 185ms | P99: 420ms"
        />

        <MetricCard
          title="CPU Utilization"
          value={cpuVal.toFixed(1)}
          unit="%"
          progressBar={cpuVal}
          status={cpuVal > 85 ? 'critical' : cpuVal > 70 ? 'warning' : 'healthy'}
          icon={<Cpu className="w-4 h-4" />}
          subtitle="Host peak: 94.7%"
        />

        <MetricCard
          title="Memory Utilization"
          value={memVal.toFixed(1)}
          unit="%"
          progressBar={memVal}
          status={memVal > 85 ? 'critical' : memVal > 70 ? 'warning' : 'healthy'}
          icon={<Activity className="w-4 h-4" />}
          subtitle="RAM: 47.4 GB of 64 GB"
        />

        <MetricCard
          title="Disk Utilization"
          value={diskVal.toFixed(1)}
          unit="%"
          progressBar={diskVal}
          status="healthy"
          icon={<HardDrive className="w-4 h-4" />}
          subtitle="Storage: 3.2 TB free"
        />

       <MetricCard
  title="Network Traffic"
  value={`${((overview?.networkTraffic?.inboundMb ?? 0) / 1000).toFixed(2)}`}
  unit="Gbps"
  icon={<Wifi className="w-4 h-4" />}
  subtitle={`Out: ${((overview?.networkTraffic?.outboundMb ?? 0) / 1000).toFixed(2)} Gbps`}
/>

        <MetricCard
          title="Global Error Rate"
          value={errorVal.toFixed(2)}
          unit="%"
          status={errorVal > 1.0 ? 'critical' : errorVal > 0.5 ? 'warning' : 'healthy'}
          icon={<Activity className="w-4 h-4" />}
          trend={{ value: -12.5, isUpGood: false, period: 'last 15m' }}
          subtitle="HTTP 5xx rate: 0.18%"
        />
      </div>

      {/* Main Visualizations Row: Real-time telemetry line charts + Service Health breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Line Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>
                <Activity className="w-4 h-4 text-white" />
                Real-Time Resource Telemetry (CPU &amp; Memory)
              </CardTitle>
              <CardDescription>
                Live time-series stream across the distributed infrastructure fleet
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                INTERVAL: 3S
              </Badge>
            </div>
          </CardHeader>

          <RealtimeLineChart
            data={metricsHistory}
            height={260}
            series={[
              { key: 'cpu', name: 'CPU Utilization (%)', strokeWidth: 2.2 },
              { key: 'memory', name: 'Memory Utilization (%)', strokeWidth: 2 },
            ]}
          />
        </Card>

        {/* Service Health Distribution Donut */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                <Server className="w-4 h-4 text-white" />
                Service Health Distribution
              </CardTitle>
              <CardDescription>
                Categorization across 48 monitored microservices
              </CardDescription>
            </div>
          </CardHeader>

          {healthScore === null ? (
  <div className="h-[200px] flex items-center justify-center text-zinc-400 text-xs font-mono">
    NUMERIC HEALTH SCORE UNAVAILABLE
  </div>
) : (
  <DonutHealthChart
    data={mockServiceHealthDistribution}
    centerScore={healthScore}
    height={200}
  />
)}

          <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-zinc-800 text-center font-mono">
            {mockServiceHealthDistribution.map((item) => (
              <div key={item.name} className="p-2 rounded-lg bg-black border border-zinc-800">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] text-zinc-400 uppercase">{item.name}</span>
                </div>
                <div className="text-sm font-bold text-white">{item.count}</div>
                <div className="text-[10px] text-zinc-500">{item.percentage}%</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Grid: Recent Incidents & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents Table */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                <Flame className="w-4 h-4 text-white" />
                Active Incidents
              </CardTitle>
              <CardDescription>Correlated system disruptions under active triage</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/incidents')}
              className="text-xs font-mono"
            >
              VIEW ALL
            </Button>
          </CardHeader>

          <div className="divide-y divide-zinc-800/80">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => navigate('/incidents')}
                className="py-3 px-2 flex items-start justify-between gap-3 hover:bg-zinc-900/60 rounded-lg cursor-pointer transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white">{inc.id}</span>
                    <Badge variant={inc.severity.includes('P1') ? 'critical' : 'warning'}>
                      {inc.severity}
                    </Badge>
                    <span className="text-[11px] font-mono text-zinc-400">
                      SVC: {inc.affectedService}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 font-medium line-clamp-1">{inc.title}</p>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Detected: {inc.detectionTime} | Assignee: {inc.assignee}
                  </p>
                </div>
                <StatusPill status={inc.currentStatus} className="text-[10px] shrink-0" />
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Alerts Table */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                <AlertTriangle className="w-4 h-4 text-white" />
                Recent System Alerts
              </CardTitle>
              <CardDescription>Live threshold violations and anomaly signals</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/alerts')}
              className="text-xs font-mono"
            >
              VIEW ALL
            </Button>
          </CardHeader>

          <div className="divide-y divide-zinc-800/80">
            {alerts.map((alt) => (
              <div
                key={alt.id}
                onClick={() => navigate('/alerts')}
                className="py-3 px-2 flex items-start justify-between gap-3 hover:bg-zinc-900/60 rounded-lg cursor-pointer transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={alt.severity === 'critical' ? 'critical' : 'warning'}>
                      {alt.severity.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-mono font-medium text-white">
                      {alt.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Service: {alt.service} | Value: <span className="text-white font-semibold">{alt.currentValue}</span> (Threshold: {alt.threshold})
                  </p>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                  {alt.timestamp.slice(11, 19)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
