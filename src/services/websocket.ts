import { MetricDataPoint, AlertItem } from '../types';
import { getStoredMockMode, mockStore } from './api';

export type TelemetryListener = (point: MetricDataPoint) => void;
export type AlertListener = (alert: AlertItem) => void;
export type ConnectionStatusListener = (connected: boolean, mode: 'live_ws' | 'simulated' | 'disconnected') => void;

class TelemetryWebSocketService {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private isSimulating = false;
  private simIntervalId: any = null;
  private metricListeners: Set<TelemetryListener> = new Set();
  private alertListeners: Set<AlertListener> = new Set();
  private statusListeners: Set<ConnectionStatusListener> = new Set();
  private currentMode: 'live_ws' | 'simulated' | 'disconnected' = 'disconnected';
  private tickIntervalMs = 3000;

  constructor() {
    this.wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/telemetry';
    const envInterval = Number(import.meta.env.VITE_TELEMETRY_REFRESH_INTERVAL);
    if (!isNaN(envInterval) && envInterval > 500) {
      this.tickIntervalMs = envInterval;
    }
  }

  public connect(): void {
    if (getStoredMockMode()) {
      this.startSimulation();
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.currentMode = 'live_ws';
        this.notifyStatus(true, 'live_ws');
      };

      this.ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);

    // Existing metric message support
    if (data.type === 'metric' && data.payload) {
      this.notifyMetrics(data.payload);
    }

    // Existing alert message support
    else if (data.type === 'alert' && data.payload) {
      this.notifyAlert(data.payload);
    }

    // Backend APEX snapshot support
    else if (data.type === 'snapshot' && data.metrics) {
      const metrics = data.metrics;

      const cpu = Number(metrics.cpu_utilization);
      const memory = Number(metrics.memory_utilization);

      // CPU and memory are required by the dashboard chart type.
      if (!Number.isFinite(cpu) || !Number.isFinite(memory)) {
        console.warn('APEX snapshot missing CPU or memory metrics');
        return;
      }

      const point: MetricDataPoint = {
        timestamp: data.timestamp || new Date().toISOString(),
        cpu,
        memory,
      };

      const optionalMetrics = {
        disk: metrics.disk_utilization,
        responseTime: metrics.latency_ms ?? metrics.api_response_time,
        errorRate: metrics.error_rate,
        rps: metrics.requests_per_second,
      } as const;

      for (const [field, value] of Object.entries(optionalMetrics)) {
        if (
          typeof value === 'number' &&
          Number.isFinite(value)
        ) {
          point[field as keyof typeof optionalMetrics] = value;
        }
      }

      this.notifyMetrics(point);
    }

  } catch (error) {
    console.error('Error parsing APEX WebSocket message:', error);
  }
};

      this.ws.onerror = () => {
        // Fallback to simulation if live WS server isn't running
        if (this.currentMode !== 'simulated') {
          this.startSimulation();
        }
      };

      this.ws.onclose = () => {
        if (!getStoredMockMode() && this.currentMode === 'live_ws') {
          this.startSimulation();
        }
      };
    } catch {
      this.startSimulation();
    }
  }

  public startSimulation(): void {
    if (this.isSimulating) return;
    this.isSimulating = true;
    this.currentMode = 'simulated';
    this.notifyStatus(true, 'simulated');

    this.simIntervalId = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Generate a dynamic, bounded telemetry tick
      const lastPoint = mockStore.timeSeries[mockStore.timeSeries.length - 1] || {
        cpu: 65,
        memory: 74,
      };

      const cpuNoise = (Math.random() - 0.48) * 4;
      const memNoise = (Math.random() - 0.49) * 2;
      const newCpu = Math.min(98, Math.max(20, parseFloat((lastPoint.cpu + cpuNoise).toFixed(1))));
      const newMem = Math.min(99, Math.max(30, parseFloat((lastPoint.memory + memNoise).toFixed(1))));

      const newPoint: MetricDataPoint = {
        timestamp: timeStr,
        cpu: newCpu,
        memory: newMem,
        disk: 61.8 + parseFloat((Math.random() * 0.2).toFixed(1)),
        networkIn: Math.round(1150 + Math.random() * 200),
        networkOut: Math.round(2050 + Math.random() * 300),
        responseTime: parseFloat((78 + Math.random() * 20).toFixed(1)),
        errorRate: parseFloat((0.35 + Math.random() * 0.2).toFixed(2)),
        rps: Math.round(5100 + Math.random() * 400),
      };

      // Append to local time series store
      mockStore.timeSeries.push(newPoint);
      if (mockStore.timeSeries.length > 40) {
        mockStore.timeSeries.shift();
      }

      // Update overview snapshot
      mockStore.overview.cpuUtilization = newPoint.cpu;
      mockStore.overview.memoryUtilization = newPoint.memory;
      mockStore.overview.responseTimeMs = newPoint.responseTime || 80;
      mockStore.overview.errorRatePercent = newPoint.errorRate || 0.4;
      mockStore.overview.timestamp = now.toISOString();

      this.notifyMetrics(newPoint);
    }, this.tickIntervalMs);
  }

  public stopSimulation(): void {
    if (this.simIntervalId) {
      clearInterval(this.simIntervalId);
      this.simIntervalId = null;
    }
    this.isSimulating = false;
  }

  public disconnect(): void {
    this.stopSimulation();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentMode = 'disconnected';
    this.notifyStatus(false, 'disconnected');
  }

  public setIntervalMs(ms: number): void {
    this.tickIntervalMs = ms;
    if (this.isSimulating) {
      this.stopSimulation();
      this.startSimulation();
    }
  }

  public subscribeMetrics(listener: TelemetryListener): () => void {
    this.metricListeners.add(listener);
    return () => this.metricListeners.delete(listener);
  }

  public subscribeAlerts(listener: AlertListener): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  public subscribeStatus(listener: ConnectionStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.currentMode !== 'disconnected', this.currentMode);
    return () => this.statusListeners.delete(listener);
  }

  private notifyMetrics(point: MetricDataPoint): void {
    this.metricListeners.forEach((fn) => fn(point));
  }

  private notifyAlert(alert: AlertItem): void {
    this.alertListeners.forEach((fn) => fn(alert));
  }

  private notifyStatus(connected: boolean, mode: 'live_ws' | 'simulated' | 'disconnected'): void {
    this.statusListeners.forEach((fn) => fn(connected, mode));
  }
}

export const telemetryWS = new TelemetryWebSocketService();
