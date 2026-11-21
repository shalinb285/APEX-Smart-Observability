
import { MetricDataPoint, AlertItem } from '../types';
import { getStoredMockMode, mockStore } from './api';

export type TelemetryListener = (point: MetricDataPoint) => void;

export type AlertListener = (alert: AlertItem) => void;

export type ConnectionStatusListener = (
  connected: boolean,
  mode: 'live_ws' | 'simulated' | 'disconnected'
) => void;

type ConnectionMode = 'live_ws' | 'simulated' | 'disconnected';

class TelemetryWebSocketService {
  private ws: WebSocket | null = null;
  private wsUrl: string;

  private isSimulating = false;
  private simIntervalId: ReturnType<typeof setInterval> | null = null;

  private metricListeners = new Set<TelemetryListener>();
  private alertListeners = new Set<AlertListener>();
  private statusListeners = new Set<ConnectionStatusListener>();

  private currentMode: ConnectionMode = 'disconnected';
  private tickIntervalMs = 3000;

  constructor() {
    const apiBaseUrl =
      import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    // Explicit WebSocket URL takes priority.
    // Otherwise derive it from the API URL.
    const configuredWsUrl = import.meta.env.VITE_WS_URL;

    this.wsUrl = configuredWsUrl
      ? configuredWsUrl.replace(/\/+$/, '')
      : `${apiBaseUrl.replace(/\/+$/, '').replace(/^http/, 'ws')}/ws/telemetry`;

    const envInterval = Number(
      import.meta.env.VITE_TELEMETRY_REFRESH_INTERVAL
    );

    if (!isNaN(envInterval) && envInterval > 500) {
      this.tickIntervalMs = envInterval;
    }
  }

  // Establish WebSocket connection
  public connect(): void {
    if (getStoredMockMode()) {
      this.startSimulation();
      return;
    }

    // Avoid duplicate connections.
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (this.isSimulating) {
      return;
    }

    try {
      console.info('APEX: Connecting telemetry WebSocket:', this.wsUrl);

      const socket = new WebSocket(this.wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket) return;

        console.info('APEX: WebSocket connected');

        this.stopSimulation();
        this.currentMode = 'live_ws';
        this.notifyStatus(true, 'live_ws');
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);

          // Individual metric message
          if (data.type === 'metric' && data.payload) {
            this.notifyMetrics(data.payload);
          }

          // Individual alert message
          else if (data.type === 'alert' && data.payload) {
            this.notifyAlert(data.payload);
          }

          // Full backend telemetry snapshot
          else if (data.type === 'snapshot' && data.metrics) {
            const metrics = data.metrics;

            const cpu = Number(metrics.cpu_utilization);
            const memory = Number(metrics.memory_utilization);

            if (
              !Number.isFinite(cpu) ||
              !Number.isFinite(memory)
            ) {
              console.warn(
                'APEX: Snapshot missing valid CPU or memory metrics'
              );
              return;
            }

            const point: MetricDataPoint = {
              timestamp: data.timestamp || new Date().toISOString(),
              cpu,
              memory
            };

            const optionalMetrics = {
              disk: metrics.disk_utilization,
              responseTime:
                metrics.latency_ms ?? metrics.api_response_time,
              errorRate: metrics.error_rate,
              rps: metrics.requests_per_second
            } as const;

            for (const [field, value] of Object.entries(optionalMetrics)) {
              if (
                typeof value === 'number' &&
                Number.isFinite(value)
              ) {
                (point as any)[field] = value;
              }
            }

            this.notifyMetrics(point);
          }
        } catch (error) {
          console.error(
            'APEX: Failed to process WebSocket message:',
            error
          );
        }
      };

      socket.onerror = () => {
        if (this.ws !== socket) return;

        console.error(
          'APEX: WebSocket connection failed. Switching to simulated telemetry.'
        );

        this.ws = null;

        if (socket.readyState !== WebSocket.CLOSED) {
          socket.close();
        }

        this.startSimulation();
      };

      socket.onclose = () => {
        if (this.ws === socket) {
          this.ws = null;
        }

        // Use simulation if the live connection drops.
        if (
          !getStoredMockMode() &&
          this.currentMode === 'live_ws'
        ) {
          console.warn(
            'APEX: WebSocket disconnected. Switching to simulated telemetry.'
          );

          this.startSimulation();
        }
      };
    } catch (error) {
      console.error('APEX: WebSocket initialization failed:', error);
      this.startSimulation();
    }
  }

  // Start fallback telemetry simulation
  public startSimulation(): void {
    if (this.isSimulating) return;

    this.stopSimulation();

    this.isSimulating = true;
    this.currentMode = 'simulated';

    console.warn('APEX: Running in simulated telemetry mode');

    this.notifyStatus(true, 'simulated');

    this.simIntervalId = setInterval(() => {
      const now = new Date();

      const timeStr = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const lastPoint =
        mockStore.timeSeries[mockStore.timeSeries.length - 1] || {
          cpu: 65,
          memory: 74
        };

      const cpuNoise = (Math.random() - 0.48) * 4;
      const memNoise = (Math.random() - 0.49) * 2;

      const newCpu = Math.min(
        98,
        Math.max(
          20,
          parseFloat((lastPoint.cpu + cpuNoise).toFixed(1))
        )
      );

      const newMem = Math.min(
        99,
        Math.max(
          30,
          parseFloat((lastPoint.memory + memNoise).toFixed(1))
        )
      );

      const newPoint: MetricDataPoint = {
        timestamp: timeStr,
        cpu: newCpu,
        memory: newMem,
        disk: 61.8 + parseFloat((Math.random() * 0.2).toFixed(1)),
        networkIn: Math.round(1150 + Math.random() * 200),
        networkOut: Math.round(2050 + Math.random() * 300),
        responseTime: parseFloat(
          (78 + Math.random() * 20).toFixed(1)
        ),
        errorRate: parseFloat(
          (0.35 + Math.random() * 0.2).toFixed(2)
        ),
        rps: Math.round(5100 + Math.random() * 400)
      };

      mockStore.timeSeries.push(newPoint);

      if (mockStore.timeSeries.length > 40) {
        mockStore.timeSeries.shift();
      }

      mockStore.overview.cpuUtilization = newPoint.cpu;
      mockStore.overview.memoryUtilization = newPoint.memory;
      mockStore.overview.responseTimeMs =
        newPoint.responseTime || 80;
      mockStore.overview.errorRatePercent =
        newPoint.errorRate || 0.4;
      mockStore.overview.timestamp = now.toISOString();

      this.notifyMetrics(newPoint);
    }, this.tickIntervalMs);
  }

  // Stop simulated telemetry
  public stopSimulation(): void {
    if (this.simIntervalId !== null) {
      clearInterval(this.simIntervalId);
      this.simIntervalId = null;
    }

    this.isSimulating = false;
  }

  // Disconnect all telemetry
  public disconnect(): void {
    this.stopSimulation();

    const socket = this.ws;
    this.ws = null;

    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      if (socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    }

    this.currentMode = 'disconnected';
    this.notifyStatus(false, 'disconnected');
  }

  // Change simulation refresh interval
  public setIntervalMs(ms: number): void {
    if (!Number.isFinite(ms) || ms < 500) return;

    this.tickIntervalMs = ms;

    if (this.isSimulating) {
      this.stopSimulation();
      this.startSimulation();
    }
  }

  // Subscribe to metrics
  public subscribeMetrics(
    listener: TelemetryListener
  ): () => void {
    this.metricListeners.add(listener);

    return () => {
      this.metricListeners.delete(listener);
    };
  }

  // Subscribe to alerts
  public subscribeAlerts(
    listener: AlertListener
  ): () => void {
    this.alertListeners.add(listener);

    return () => {
      this.alertListeners.delete(listener);
    };
  }

  // Subscribe to connection status
  public subscribeStatus(
    listener: ConnectionStatusListener
  ): () => void {
    this.statusListeners.add(listener);

    listener(
      this.currentMode !== 'disconnected',
      this.currentMode
    );

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyMetrics(point: MetricDataPoint): void {
    this.metricListeners.forEach((listener) => {
      try {
        listener(point);
      } catch (error) {
        console.error('APEX: Metric listener error:', error);
      }
    });
  }

  private notifyAlert(alert: AlertItem): void {
    this.alertListeners.forEach((listener) => {
      try {
        listener(alert);
      } catch (error) {
        console.error('APEX: Alert listener error:', error);
      }
    });
  }

  private notifyStatus(
    connected: boolean,
    mode: ConnectionMode
  ): void {
    this.statusListeners.forEach((listener) => {
      try {
        listener(connected, mode);
      } catch (error) {
        console.error('APEX: Status listener error:', error);
      }
    });
  }
}

export const telemetryWS = new TelemetryWebSocketService();
