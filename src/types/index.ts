export type HealthStatus = 'healthy' | 'warning' | 'critical';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type IncidentSeverity = 'P1 - Critical' | 'P2 - High' | 'P3 - Medium' | 'P4 - Low';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';
export type LogSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface SystemOverview {
  healthScore: number | null;
  monitoredServices: number;
  activeIncidents: number;
  criticalAlerts: number;
  cpuUtilization: number;
  memoryUtilization: number;
  diskUtilization: number;

  networkTraffic: {
    inboundMb: number;
    outboundMb: number;
  } | null;

  responseTimeMs: number;
  errorRatePercent: number;
  status: HealthStatus;
  aiHealthSummary: string;
  timestamp: string;
}

export interface MetricDataPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  disk?: number;
  networkIn?: number;
  networkOut?: number;
  responseTime?: number;
  errorRate?: number;
  rps?: number;
}

export interface ServiceHealthDistribution {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ServerInfo {
  id: string;
  hostname: string;
  ipAddress: string;
  os: string;
  region: string;
  cpuUsage: number;
  ramUsage: number;
  ramTotal: string;
  diskUsage: number;
  diskTotal: string;
  networkUtil: number;
  uptime: string;
  status: HealthStatus;
  processesCount: number;
  coreCount: number;
  loadAvg: [number, number, number];
  lastSeen: string;
  tags: string[];
}

export interface APMMetrics {
  responseTimeMs: number;
  requestsPerSecond: number;
  errorRatePercent: number;
  throughputMb: number;
  apdexScore: number;
  endpoints: {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    avgResponseTimeMs: number;
    p95ResponseTimeMs: number;
    p99ResponseTimeMs: number;
    rps: number;
    errorRate: number;
    status: HealthStatus;
  }[];
  slowTransactions: {
    id: string;
    endpoint: string;
    durationMs: number;
    timestamp: string;
    service: string;
    dbQueriesCount: number;
    status: string;
  }[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  service: string;
  severity: LogSeverity;
  message: string;
  traceId?: string;
  host?: string;
  environment: string;
  payload?: Record<string, unknown>;
  stackTrace?: string;
}

export interface TraceSpan {
  id: string;
  parentId?: string;
  service: string;
  operation: string;
  durationMs: number;
  offsetMs: number;
  status: 'success' | 'error';
  httpStatus?: number;
  tags?: Record<string, string>;
}

export interface DistributedTrace {
  traceId: string;
  rootService: string;
  endpoint: string;
  totalDurationMs: number;
  spanCount: number;
  status: 'success' | 'error';
  timestamp: string;
  httpStatus: number;
  spans: TraceSpan[];
}

export interface ServiceNode {
  id: string;
  name: string;
  type: 'gateway' | 'service' | 'database' | 'cache' | 'queue';
  health: HealthStatus;
  rps: number;
  latencyMs: number;
  errorRate: number;
  x: number;
  y: number;
}

export interface ServiceEdge {
  from: string;
  to: string;
  callsPerSec: number;
  latencyMs: number;
  errorRate: number;
}

export interface AnomalyItem {
  id: string;
  title: string;
  service: string;
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedValue: number;
  actualValue: number;
  unit: string;
  deviationPercent: number;
  timestamp: string;
  confidenceScore: number; // 0 to 100
  status: 'active' | 'investigating' | 'resolved';
}

export interface PredictionForecast {
  id: string;
  metric: 'CPU' | 'Memory' | 'Disk' | 'FailureRisk';
  title: string;
  targetService: string;
  currentValue: number;
  projectedPeak: number;
  thresholdValue: number;
  timeToExhaustion?: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  summary: string;
  dataPoints: {
    timestamp: string;
    actual?: number;
    predicted: number;
    upperBand: number;
    lowerBand: number;
  }[];
}

export interface RootCauseAnalysis {
  id: string;
  issue: string;
  suspectedRootCause: string;
  affectedServices: string[];
  relatedMetrics: string[];
  evidence: string[];
  confidenceScore: number;
  timestamp: string;
  recommendedRemediation: string;
  remediationActionId?: string;
}

export interface AIRecommendation {
  id: string;
  title: string;
  service: string;
  priority: 'P1' | 'P2' | 'P3';
  expectedImpact: string;
  suggestedRemediation: string;
  remediationActionId?: string;
  status: 'pending' | 'applied' | 'dismissed';
  createdAt: string;
}

export interface AlertItem {
  id: string;
  title: string;
  service: string;
  severity: AlertSeverity;
  status: AlertStatus;
  currentValue: string;
  threshold: string;
  timestamp: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  recommendedAction: string;
}

export interface IncidentNote {
  id: string;
  author: string;
  timestamp: string;
  text: string;
}

export interface IncidentTimelineEvent {
  timestamp: string;
  event: string;
  actor: string;
  type?: 'status' | 'comment' | 'remediation' | 'system';
}

export interface IncidentItem {
  id: string;
  title: string;
  severity: IncidentSeverity;
  affectedService: string;
  detectionTime: string;
  currentStatus: IncidentStatus;
  rootCause: string;
  resolutionDetails: string;
  assignee: string;
  notes: IncidentNote[];
  timeline: IncidentTimelineEvent[];
}

export interface RemediationAction {
  id: string;
  type: 'restart' | 'scale' | 'clear_cache' | 'rollback' | 'playbook';
  title: string;
  description: string;
  targetService: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedDuration: string;
  parameters?: Record<string, string | number>;
}

export interface RemediationHistoryItem {
  id: string;
  actionId: string;
  actionTitle: string;
  targetService: string;
  executedBy: string;
  timestamp: string;
  status: 'success' | 'failed' | 'in_progress';
  beforeHealth: string;
  afterHealth: string;
  logOutput: string;
}

export interface SystemReport {
  id: string;
  period: string;
  generatedAt: string;
  overallUptimePercent: number;
  totalIncidents: number;
  mttrMinutes: number;
  mttdMinutes: number;
  totalAlerts: number;
  serviceAvailability: {
    service: string;
    uptimePercent: number;
    incidents: number;
    avgLatencyMs: number;
  }[];
  alertFrequency: {
    date: string;
    critical: number;
    warning: number;
    info: number;
  }[];
  performanceTrends: {
    week: string;
    avgLatencyMs: number;
    p99LatencyMs: number;
    errorRate: number;
  }[];
}
