// APEX Centralized API Service Layer
// Dashboard telemetry, observability, alerts, incidents and remediation APIs.
// Mock data is used only when mock mode is explicitly enabled. In live mode,
// backend failures are surfaced instead of silently replaced with demo data.

import axios, { AxiosInstance } from 'axios';
import {
  SystemOverview,
  MetricDataPoint,
  ServerInfo,
  APMMetrics,
  LogEntry,
  DistributedTrace,
  AnomalyItem,
  PredictionForecast,
  RootCauseAnalysis,
  AlertItem,
  IncidentItem,
  RemediationAction,
  RemediationHistoryItem,
  SystemReport,
} from '../types';
import {
  mockOverview,
  mockTimeSeriesMetrics,
  mockServers,
  mockAPMMetrics,
  mockLogs,
  mockDistributedTraces,
  mockAnomalies,
  mockPredictions,
  mockRootCauseAnalysis,
  mockAIRecommendations,
  mockAlerts,
  mockIncidents,
  mockRemediationActions,
  mockRemediationHistory,
  mockSystemReport,
} from './mockData';

// ==========================================
// API CONFIGURATION
// ==========================================

// In production, set VITE_API_BASE_URL to the publicly reachable FastAPI URL.
// The localhost fallback is intentionally development-only: a browser deployed
// on Vercel cannot reach the developer's localhost. An empty production base URL
// uses same-origin relative requests if the API is reverse-proxied by the host.
const configuredApiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL as string | undefined
)?.trim();

export const API_BASE_URL = (
  configuredApiBaseUrl || (import.meta.env.DEV ? 'http://localhost:8000' : '')
).replace(/\/+$/, '');

if (import.meta.env.PROD && !configuredApiBaseUrl) {
  console.warn(
    'APEX: VITE_API_BASE_URL is not configured. API requests will use the current website origin. ' +
      'Set VITE_API_BASE_URL in Vercel if FastAPI is hosted separately.'
  );
}

// Mock mode controls dashboard/demo data only. It does NOT bypass login, MFA,
// authorization, or any backend authentication endpoint. A localStorage choice
// takes precedence over the Vite environment default until it is cleared.
const MOCK_STORAGE_KEY = 'apex_use_mock_data';

const canUseLocalStorage = (): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

export const getStoredMockMode = (): boolean => {
  if (canUseLocalStorage()) {
    try {
      const stored = window.localStorage.getItem(MOCK_STORAGE_KEY);
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch (error) {
      console.warn('APEX: Could not read mock-mode preference.', error);
    }
  }

  return import.meta.env.VITE_USE_MOCK_DATA === 'true';
};

export const setStoredMockMode = (enabled: boolean): void => {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(MOCK_STORAGE_KEY, String(enabled));
  } catch (error) {
    console.warn('APEX: Could not save mock-mode preference.', error);
  }
};

export const clearStoredMockMode = (): void => {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.removeItem(MOCK_STORAGE_KEY);
  } catch (error) {
    console.warn('APEX: Could not clear mock-mode preference.', error);
  }
};

// ==========================================
// AXIOS CLIENT & IN-MEMORY TOKEN VAULT
// ==========================================

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Access tokens remain in memory and are never persisted by this module.
let accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => accessToken;

// Attach the current bearer token to authenticated API requests.
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else if (config.headers.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

interface BackendMetricDataPoint {
  timestamp: string;
  value: number;
}

interface BackendMetricAggregate {
  metric_name: string;
  current: number | null;
  average: number | null;
  count: number;
  data_points: BackendMetricDataPoint[];
}

interface BackendDashboardPayload {
  health?: {
    overall_health?: string;
  };
  metric_summaries?: Array<{
    metric_name: string;
    current_value: number | null;
    average_24h?: number | null;
    status?: string;
  }>;
  total_servers?: number;
  total_services?: number;
  active_incidents?: number;
  critical_alerts?: number;
  dashboard_generated_at?: string;
}
// In-memory mock store for interactive mutation during session
class LocalMockStore {
  overview: SystemOverview = { ...mockOverview };
  servers: ServerInfo[] = [...mockServers];
  logs: LogEntry[] = [...mockLogs];
  traces: DistributedTrace[] = [...mockDistributedTraces];
  anomalies: AnomalyItem[] = [...mockAnomalies];
  predictions: PredictionForecast[] = [...mockPredictions];
  rootCause: RootCauseAnalysis = { ...mockRootCauseAnalysis };
  recommendations = [...mockAIRecommendations];
  alerts: AlertItem[] = [...mockAlerts];
  incidents: IncidentItem[] = [...mockIncidents];
  remediationActions: RemediationAction[] = [...mockRemediationActions];
  remediationHistory: RemediationHistoryItem[] = [...mockRemediationHistory];
  report: SystemReport = { ...mockSystemReport };
  timeSeries: MetricDataPoint[] = [...mockTimeSeriesMetrics];

  updateAlert(id: string, updates: Partial<AlertItem>): AlertItem | null {
    const idx = this.alerts.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.alerts[idx] = { ...this.alerts[idx], ...updates };
      return this.alerts[idx];
    }
    return null;
  }

  updateIncident(id: string, updates: Partial<IncidentItem>): IncidentItem | null {
    const idx = this.incidents.findIndex(i => i.id === id);
    if (idx !== -1) {
      this.incidents[idx] = { ...this.incidents[idx], ...updates };
      return this.incidents[idx];
    }
    return null;
  }

  addIncidentNote(id: string, noteText: string, author = 'Current User'): IncidentItem | null {
    const idx = this.incidents.findIndex(i => i.id === id);
    if (idx !== -1) {
      const newNote = {
        id: `note-${Date.now()}`,
        author,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: noteText,
      };
      this.incidents[idx].notes.push(newNote);
      this.incidents[idx].timeline.push({
        timestamp: newNote.timestamp,
        event: `Note added by ${author}: "${noteText.slice(0, 40)}..."`,
        actor: author,
        type: 'comment',
      });
      return this.incidents[idx];
    }
    return null;
  }

  executeRemediation(actionId: string, parameters?: Record<string, unknown>): RemediationHistoryItem {
    const action = this.remediationActions.find(a => a.id === actionId);
    const title = action ? action.title : `Remediation action ${actionId}`;
    const target = action ? action.targetService : 'system-target';

    const historyItem: RemediationHistoryItem = {
      id: `rem-hist-${Date.now().toString().slice(-4)}`,
      actionId,
      actionTitle: title,
      targetService: target,
      executedBy: 'APEX Mock Simulator (Demo Only)',
      timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      status: 'success',
      beforeHealth: 'Critical / Degrading',
      afterHealth: 'Stabilized (Healthy)',
      logOutput: `[SIMULATED] Starting demo action: ${title} on ${target}...\n[SIMULATED] No production infrastructure was changed.\n[DEMO] Mock remediation flow completed for demonstration purposes.`,
    };

    this.remediationHistory.unshift(historyItem);

    // If rollback or scale was executed, update related alerts/incidents
    if (actionId.includes('rollback') || actionId.includes('scale')) {
     this.overview.healthScore = Math.min(
  100,
  (this.overview.healthScore ?? 0) + 4.5
);
      this.overview.activeIncidents = Math.max(0, this.overview.activeIncidents - 1);
      this.overview.status = 'healthy';
    }

    return historyItem;
  }
}

export const mockStore = new LocalMockStore();

// Centralized API Services with Mock Fallback
export const api = {
  // GET /api/v1/dashboard/overview
  async getDashboardOverview(): Promise<SystemOverview> {
  if (getStoredMockMode()) {
    return { ...mockStore.overview };
  }

  try {
    const response = await apiClient.get<BackendDashboardPayload>(
      '/api/v1/dashboard/overview'
    );

    const data = response.data;

    const summaries = new Map(
      (data.metric_summaries ?? []).map(item => [
        item.metric_name,
        item,
      ])
    );

    const current = (name: string): number =>
      summaries.get(name)?.current_value ?? 0;

    const backendHealth = data.health?.overall_health?.toUpperCase();

    const status: SystemOverview['status'] =
      backendHealth === 'EXCELLENT' || backendHealth === 'GOOD'
        ? 'healthy'
        : backendHealth === 'FAIR'
          ? 'warning'
          : 'critical';

    return {
      healthScore: null,
      monitoredServices: data.total_services ?? 0,
      activeIncidents: data.active_incidents ?? 0,
      criticalAlerts: data.critical_alerts ?? 0,

      cpuUtilization: current('cpu_utilization'),
      memoryUtilization: current('memory_utilization'),
      diskUtilization: current('disk_utilization'),

      networkTraffic: null,

      responseTimeMs: current('latency_ms'),
      errorRatePercent: current('error_rate'),

      status,

      aiHealthSummary:
        `Backend reports ${backendHealth ?? 'UNKNOWN'} overall health across ` +
        `${data.total_servers ?? 0} servers and ${data.total_services ?? 0} services.`,

      timestamp: data.dashboard_generated_at ?? new Date().toISOString(),
    };
  } catch (err) {
    console.error('Live dashboard API failed:', err);
    throw err;
  }
},

  // GET /api/v1/metrics/query
  async getMetricsQuery(params?: {
  range?: string;
  service?: string;
}): Promise<MetricDataPoint[]> {

  if (getStoredMockMode()) {
    return mockStore.timeSeries;
  }

  const metricDefinitions: {
    name: string;
    field: keyof MetricDataPoint;
  }[] = [
    { name: 'cpu_utilization', field: 'cpu' },
    { name: 'memory_utilization', field: 'memory' },
    { name: 'disk_utilization', field: 'disk' },
    { name: 'latency_ms', field: 'responseTime' },
    { name: 'error_rate', field: 'errorRate' },
    { name: 'requests_per_second', field: 'rps' },
  ];

  const requestParams: Record<string, string> = {
    interval: '5m',
  };

  if (params?.service && params.service !== 'all') {
    requestParams.service_name = params.service;
  }

  const rangeMatch = params?.range?.match(
    /(\d+)\s*(m|min(?:ute)?s?|h|hr|hours?|d|days?)/i
  );

  if (rangeMatch) {
    const amount = Number(rangeMatch[1]);
    const unit = rangeMatch[2].toLowerCase()[0];

    const minutes =
      unit === 'h' ? amount * 60 :
      unit === 'd' ? amount * 1440 :
      amount;

    const end = new Date();

    requestParams.start_time = new Date(
      end.getTime() - minutes * 60_000
    ).toISOString();

    requestParams.end_time = end.toISOString();
  }

  try {
    const responses = await Promise.all(
      metricDefinitions.map(metric =>
        apiClient.get<BackendMetricAggregate>(
          '/api/v1/metrics/query',
          {
            params: {
              metric_name: metric.name,
              ...requestParams,
            },
          }
        )
      )
    );

    const buckets: Record<string, Map<string, number[]>> = {};

    for (const metric of metricDefinitions) {
      buckets[metric.field] = new Map();
    }

    responses.forEach((response, index) => {
      const field = metricDefinitions[index].field;

      for (const point of response.data.data_points ?? []) {
        const parsedDate = new Date(point.timestamp);

        if (Number.isNaN(parsedDate.getTime())) {
          continue;
        }

        const timestamp = parsedDate.toISOString();

        const values = buckets[field].get(timestamp) ?? [];

        values.push(Number(point.value));

        buckets[field].set(timestamp, values);
      }
    });

    const averageAt = (
      field: string,
      timestamp: string
    ): number | undefined => {
      const values = buckets[field]?.get(timestamp);

      if (!values || values.length === 0) {
        return undefined;
      }

      return values.reduce((sum, value) => sum + value, 0)
        / values.length;
    };

    const timestamps = [
      ...new Set(
        Array.from(buckets.cpu.keys())
      ),
    ].sort();

    const combined: MetricDataPoint[] = [];

    for (const timestamp of timestamps) {
      const cpu = averageAt('cpu', timestamp);
      const memory = averageAt('memory', timestamp);

      if (cpu === undefined || memory === undefined) {
        continue;
      }

      const point: MetricDataPoint = {
        timestamp,
        cpu,
        memory,
      };

      const disk = averageAt('disk', timestamp);
      const responseTime = averageAt('responseTime', timestamp);
      const errorRate = averageAt('errorRate', timestamp);
      const rps = averageAt('rps', timestamp);

      if (disk !== undefined) point.disk = disk;
      if (responseTime !== undefined) point.responseTime = responseTime;
      if (errorRate !== undefined) point.errorRate = errorRate;
      if (rps !== undefined) point.rps = rps;

      combined.push(point);
    }

    console.log(
      'APEX: Successfully loaded backend metrics',
      {
        records: combined.length,
        metrics: metricDefinitions.length,
      }
    );

    return combined.slice(-500);

  } catch (err) {
    console.error('Live backend metrics request failed:', err);
    throw err;
  }
},

  // GET /api/v1/infrastructure/servers
  async getServers(): Promise<ServerInfo[]> {
    if (getStoredMockMode()) {
      return [...mockStore.servers];
    }
    try {
      const response = await apiClient.get<ServerInfo[]>('/api/v1/infrastructure/servers');
      return response.data;
    } catch (err) {
      console.error('APEX: Failed to load infrastructure servers from the backend.', err);
      throw err;
    }
  },

  // GET /api/v1/apm/metrics (Application Performance Monitoring)
  async getAPMMetrics(timeRange = '1h'): Promise<APMMetrics> {
    if (getStoredMockMode()) {
      return { ...mockAPMMetrics };
    }
    try {
      const response = await apiClient.get<APMMetrics>('/api/v1/apm/metrics', { params: { range: timeRange } });
      return response.data;
    } catch (err) {
      console.error('APEX: Failed to load APM metrics from the backend.', err);
      throw err;
    }
  },

  // GET /api/v1/logs
  async getLogs(params?: { service?: string; severity?: string; search?: string }): Promise<LogEntry[]> {
    if (getStoredMockMode()) {
      let filtered = [...mockStore.logs];
      if (params?.service && params.service !== 'all') {
        filtered = filtered.filter(l => l.service.toLowerCase().includes(params.service!.toLowerCase()));
      }
      if (params?.severity && params.severity !== 'all') {
        filtered = filtered.filter(l => l.severity.toLowerCase() === params.severity!.toLowerCase());
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(l => l.message.toLowerCase().includes(q) || l.service.toLowerCase().includes(q) || (l.traceId && l.traceId.toLowerCase().includes(q)));
      }
      return filtered;
    }
    try {
      const response = await apiClient.get<LogEntry[]>('/api/v1/logs', { params });
      return response.data;
    } catch (err) {
      console.error('APEX: Failed to load logs from the backend.', err);
      throw err;
    }
  },

  // GET /api/v1/traces
  async getTraces(params?: { search?: string; status?: string }): Promise<DistributedTrace[]> {
    if (getStoredMockMode()) {
      let traces = [...mockStore.traces];
      if (params?.status && params.status !== 'all') {
        traces = traces.filter(t => t.status === params.status);
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        traces = traces.filter(t => t.traceId.toLowerCase().includes(q) || t.endpoint.toLowerCase().includes(q) || t.rootService.toLowerCase().includes(q));
      }
      return traces;
    }
    try {
      const response = await apiClient.get<DistributedTrace[]>('/api/v1/traces', { params });
      return response.data;
    } catch (err) {
      console.error('APEX: Failed to load traces from the backend.', err);
      throw err;
    }
  },

  // GET /api/v1/anomalies
  async getAnomalies(): Promise<AnomalyItem[]> {
    if (getStoredMockMode()) {
      return [...mockStore.anomalies];
    }
    try {
      const response = await apiClient.get<AnomalyItem[]>('/api/v1/anomalies');
      return response.data;
    } catch (err) {
      console.error('APEX: Failed to load anomalies from the backend.', err);
      throw err;
    }
  },

  // GET /api/v1/predictions
  async getPredictions(): Promise<PredictionForecast[]> {
    if (getStoredMockMode()) {
      return [...mockStore.predictions];
    }
    try {
      const response = await apiClient.get<PredictionForecast[]>('/api/v1/predictions');
      return response.data;
    } catch (err) {
      console.error('APEX: Failed to load forecasts from the backend.', err);
      throw err;
    }
  },

  // GET /api/v1/root-cause
  async getRootCause(): Promise<RootCauseAnalysis> {
    if (getStoredMockMode()) {
      return { ...mockStore.rootCause };
    }
    try {
      const response = await apiClient.get<RootCauseAnalysis>('/api/v1/root-cause');
      return response.data;
    } catch (err) {
      console.error('APEX: Failed to load root-cause analysis from the backend.', err);
      throw err;
    }
  },

  // GET /api/v1/alerts
  async getAlerts(params?: { severity?: string; service?: string; status?: string }): Promise<AlertItem[]> {
    if (getStoredMockMode()) {
      let filtered = [...mockStore.alerts];
      if (params?.status && params.status !== 'all') {
        filtered = filtered.filter(a => a.status === params.status);
      }
      if (params?.severity && params.severity !== 'all') {
        filtered = filtered.filter(a => a.severity === params.severity);
      }
      if (params?.service && params.service !== 'all') {
        filtered = filtered.filter(a => a.service.toLowerCase().includes(params.service!.toLowerCase()));
      }
      return filtered;
    }
    try {
      const response = await apiClient.get<AlertItem[]>('/api/v1/alerts', { params });
      return response.data;
    } catch (err) {
      console.error('APEX: Failed to load alerts from the backend.', err);
      throw err;
    }
  },

  // PATCH /api/v1/alerts/{id}
  async updateAlert(id: string, updates: Partial<AlertItem>): Promise<AlertItem> {
    if (getStoredMockMode()) {
      const updated = mockStore.updateAlert(id, updates);
      if (updated) return updated;
      throw new Error(`Alert with id ${id} not found.`);
    }
    try {
      const response = await apiClient.patch<AlertItem>(`/api/v1/alerts/${id}`, updates);
      return response.data;
    } catch (err) {
      console.error(`APEX: Failed to update alert ${id} in the backend.`, err);
      throw err;
    }
  },

  // GET /api/v1/incidents
  async getIncidents(): Promise<IncidentItem[]> {
    if (getStoredMockMode()) {
      return [...mockStore.incidents];
    }
    try {
      const response = await apiClient.get<IncidentItem[]>('/api/v1/incidents');
      return response.data;
    } catch (err) {
      console.error('APEX: Failed to load incidents from the backend.', err);
      throw err;
    }
  },

  // PATCH /api/v1/incidents/{id}
  async updateIncident(id: string, updates: Partial<IncidentItem>): Promise<IncidentItem> {
    if (getStoredMockMode()) {
      const updated = mockStore.updateIncident(id, updates);
      if (updated) return updated;
      throw new Error(`Incident with id ${id} not found.`);
    }
    try {
      const response = await apiClient.patch<IncidentItem>(`/api/v1/incidents/${id}`, updates);
      return response.data;
    } catch (err) {
      console.error(`APEX: Failed to update incident ${id} in the backend.`, err);
      throw err;
    }
  },

  // GET /api/v1/remediation/actions
  async getRemediationActions(): Promise<RemediationAction[]> {
    if (getStoredMockMode()) {
      return [...mockStore.remediationActions];
    }
    try {
      const response = await apiClient.get<RemediationAction[]>('/api/v1/remediation/actions');
      return response.data;
    } catch (err) {
      console.error('APEX: Failed to load remediation actions from the backend.', err);
      throw err;
    }
  },

  // GET /api/v1/remediation/history
  async getRemediationHistory(): Promise<RemediationHistoryItem[]> {
    if (getStoredMockMode()) {
      return [...mockStore.remediationHistory];
    }
    try {
      const response = await apiClient.get<RemediationHistoryItem[]>('/api/v1/remediation/history');
      return response.data;
    } catch (err) {
      console.error('APEX: Failed to load remediation history from the backend.', err);
      throw err;
    }
  },

  // POST /api/v1/remediation/execute
  async executeRemediation(actionId: string, parameters?: Record<string, unknown>): Promise<RemediationHistoryItem> {
    if (getStoredMockMode()) {
      return mockStore.executeRemediation(actionId, parameters);
    }
    try {
      const response = await apiClient.post<RemediationHistoryItem>('/api/v1/remediation/execute', { actionId, parameters });
      return response.data;
    } catch (err) {
      console.error('APEX: Backend remediation request failed; no local success will be fabricated.', err);
      throw err;
    }
  },

  // GET /api/v1/reports
  async getReports(): Promise<SystemReport> {
    if (getStoredMockMode()) {
      return { ...mockStore.report };
    }
    try {
      const response = await apiClient.get<SystemReport>('/api/v1/reports');
      return response.data;
    } catch (err) {
      console.error('APEX: Failed to load reports from the backend.', err);
      throw err;
    }
  },

  // Check backend health / connection test
  async checkBackendConnection(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      await apiClient.get('/api/v1/dashboard/overview', { timeout: 3000 });
      const latencyMs = Math.round(performance.now() - start);
      return { online: true, latencyMs };
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - start);
      const message = err instanceof Error ? err.message : 'Connection refused';
      return { online: false, latencyMs, error: message };
    }
  },
};
