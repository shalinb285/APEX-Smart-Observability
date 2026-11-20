import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SystemOverview, MetricDataPoint } from '../types';
import { api, getStoredMockMode, setStoredMockMode } from '../services/api';
import { telemetryWS } from '../services/websocket';

interface MonitoringContextType {
  overview: SystemOverview | null;
  metricsHistory: MetricDataPoint[];
  latestMetric: MetricDataPoint | null;
  isLoading: boolean;
  isLiveStreaming: boolean;
  streamMode: 'live_ws' | 'simulated' | 'disconnected';
  mockMode: boolean;
  tickInterval: number;
  activeAlertsCount: number;
  activeIncidentsCount: number;
  toggleLiveStream: () => void;
  toggleMockMode: (enable?: boolean) => void;
  setTickInterval: (ms: number) => void;
  refreshOverview: () => Promise<void>;
  notification: { type: 'info' | 'success' | 'warning' | 'error'; message: string } | null;
  showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  clearNotification: () => void;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

export const MonitoringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<MetricDataPoint[]>([]);
  const [latestMetric, setLatestMetric] = useState<MetricDataPoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [streamMode, setStreamMode] = useState<'live_ws' | 'simulated' | 'disconnected'>('disconnected');
  const [mockMode, setMockMode] = useState<boolean>(getStoredMockMode());
  const [tickInterval, setTickIntervalState] = useState<number>(3000);
  const [notification, setNotification] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; message: string } | null>(null);

  const showNotification = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 5000);
  }, []);

  const clearNotification = useCallback(() => setNotification(null), []);

  const refreshOverview = useCallback(async () => {
    try {
      const data = await api.getDashboardOverview();
      setOverview(data);
    } catch (e) {
      console.error('Failed to load dashboard overview', e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setIsLoading(true);
      try {
        const [dashData, historyData] = await Promise.all([
          api.getDashboardOverview(),
          api.getMetricsQuery(),
        ]);
        if (mounted) {
          setOverview(dashData);
          setMetricsHistory(historyData);
          if (historyData.length > 0) {
            setLatestMetric(historyData[historyData.length - 1]);
          }
        }
      } catch (err) {
        console.error('Initialization error', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [mockMode]);

  // Connect WebSocket & subscribe to real-time streams
  useEffect(() => {
    telemetryWS.connect();

    const unsubMetrics = telemetryWS.subscribeMetrics((newPoint) => {
      setLatestMetric(newPoint);
      setMetricsHistory((prev) => {
        const updated = [...prev, newPoint];
        return updated.length > 35 ? updated.slice(updated.length - 35) : updated;
      });

      setOverview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cpuUtilization: newPoint.cpu,
          memoryUtilization: newPoint.memory,
          responseTimeMs: newPoint.responseTime || prev.responseTimeMs,
          errorRatePercent: newPoint.errorRate || prev.errorRatePercent,
          timestamp: new Date().toISOString(),
        };
      });
    });

    const unsubStatus = telemetryWS.subscribeStatus((connected, mode) => {
      setStreamMode(mode);
      setIsLiveStreaming(connected);
    });

    return () => {
      unsubMetrics();
      unsubStatus();
      telemetryWS.disconnect();
    };
  }, []);

  const toggleLiveStream = useCallback(() => {
    if (isLiveStreaming) {
      telemetryWS.stopSimulation();
      setIsLiveStreaming(false);
      showNotification('Live telemetry streaming paused', 'info');
    } else {
      telemetryWS.startSimulation();
      setIsLiveStreaming(true);
      showNotification('Live telemetry streaming active', 'success');
    }
  }, [isLiveStreaming, showNotification]);

  const toggleMockMode = useCallback((enable?: boolean) => {
    const nextVal = enable !== undefined ? enable : !mockMode;
    setStoredMockMode(nextVal);
    setMockMode(nextVal);
    showNotification(
      nextVal
        ? 'Mock Mode activated (Serving high-fidelity telemetry locally)'
        : 'Mock Mode deactivated (Connecting to Live Backend)',
      'info'
    );
  }, [mockMode, showNotification]);

  const setTickInterval = useCallback((ms: number) => {
    setTickIntervalState(ms);
    telemetryWS.setIntervalMs(ms);
  }, []);

  const activeAlertsCount = overview?.criticalAlerts ?? 3;
  const activeIncidentsCount = overview?.activeIncidents ?? 2;

  return (
    <MonitoringContext.Provider
      value={{
        overview,
        metricsHistory,
        latestMetric,
        isLoading,
        isLiveStreaming,
        streamMode,
        mockMode,
        tickInterval,
        activeAlertsCount,
        activeIncidentsCount,
        toggleLiveStream,
        toggleMockMode,
        setTickInterval,
        refreshOverview,
        notification,
        showNotification,
        clearNotification,
      }}
    >
      {children}
    </MonitoringContext.Provider>
  );
};

export const useMonitoring = () => {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
};
