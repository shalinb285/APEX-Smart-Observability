import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { AlertItem } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusPill } from '../components/ui/StatusPill';
import { SearchInput } from '../components/ui/SearchInput';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/LoadingSkeleton';
import { useMonitoring } from '../context/MonitoringContext';

type StatusFilter = 'all' | 'active' | 'acknowledged' | 'resolved';
type SeverityFilter = 'all' | 'critical' | 'warning' | 'info';

const isRecord = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const firstArray = (value: unknown, depth = 0): unknown[] | null => {
  if (Array.isArray(value)) return value;
  if (!isRecord(value) || depth > 3) return null;

  // APIs commonly wrap lists in one or more of these properties.
  for (const key of ['alerts', 'items', 'results', 'data', 'records']) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
    const nested = firstArray(candidate, depth + 1);
    if (nested) return nested;
  }
  return null;
};

const normalizeAlerts = (payload: unknown): AlertItem[] => {
  const rows = firstArray(payload);
  if (!rows) {
    console.warn('APEX alerts API returned an unexpected response shape:', payload);
    return [];
  }

  return rows
    .filter(isRecord)
    .map((row, index) => {
      const severity = ['critical', 'warning', 'info'].includes(String(row.severity).toLowerCase())
        ? String(row.severity).toLowerCase()
        : 'info';
      const status = ['active', 'acknowledged', 'resolved'].includes(String(row.status).toLowerCase())
        ? String(row.status).toLowerCase()
        : 'active';

      return {
        ...row,
        id: String(row.id ?? row.alert_id ?? `alert-${index + 1}`),
        title: String(row.title ?? row.name ?? row.message ?? 'Untitled alert'),
        service: String(row.service ?? row.service_name ?? row.target ?? 'Unknown service'),
        severity,
        status,
        currentValue: row.currentValue ?? row.current_value ?? row.value ?? '—',
        threshold: row.threshold ?? row.threshold_rule ?? '—',
        timestamp: String(row.timestamp ?? row.triggered_at ?? row.created_at ?? '—'),
        recommendedAction: String(
          row.recommendedAction ?? row.recommended_action ?? row.suggestion ?? 'Review the affected service and inspect recent telemetry.'
        ),
      } as AlertItem;
    });
};

const normalizeUpdatedAlert = (payload: unknown, fallback: AlertItem): AlertItem => {
  if (!isRecord(payload)) return fallback;
  const candidate = isRecord(payload.alert) ? payload.alert : payload;
  return {
    ...fallback,
    ...candidate,
    id: String(candidate.id ?? candidate.alert_id ?? fallback.id),
  } as AlertItem;
};

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const { showNotification } = useMonitoring();

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const response = await api.getAlerts({
        status: statusFilter,
        severity: severityFilter,
      });
      setAlerts(normalizeAlerts(response));
    } catch (error) {
      console.error('APEX failed to load alerts:', error);
      setLoadError('Unable to load alerts from the server. Check the API connection and try again.');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  const updateAlertStatus = async (
    alertItem: AlertItem,
    status: 'acknowledged' | 'resolved'
  ) => {
    if (actionInProgress) return;
    setActionInProgress(alertItem.id);

    const updatePayload = status === 'acknowledged'
      ? {
          status,
          acknowledgedBy: 'Current SRE User',
          acknowledgedAt: new Date().toISOString(),
        }
      : {
          status,
          resolvedAt: new Date().toISOString(),
        };

    try {
      const response = await api.updateAlert(alertItem.id, updatePayload);
      const updated = normalizeUpdatedAlert(response, { ...alertItem, ...updatePayload } as AlertItem);

      // Update locally even if the backend returns an empty response body.
      setAlerts((previous) =>
        previous.map((item) => item.id === alertItem.id ? updated : item)
      );
      setSelectedAlert((previous) =>
        previous?.id === alertItem.id ? updated : previous
      );
      showNotification(
        status === 'acknowledged'
          ? `Alert ${alertItem.id} acknowledged`
          : `Alert ${alertItem.id} marked as resolved`,
        'success'
      );
    } catch (error) {
      console.error(`APEX failed to ${status} alert:`, error);
      showNotification(
        status === 'acknowledged' ? 'Failed to acknowledge alert' : 'Failed to resolve alert',
        'error'
      );
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredAlerts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return alerts.filter((alert) => {
      const matchesSearch = !query ||
        alert.title.toLowerCase().includes(query) ||
        alert.service.toLowerCase().includes(query) ||
        alert.id.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [alerts, searchTerm, statusFilter, severityFilter]);

  const activeCount = alerts.filter((alert) => alert.status === 'active').length;
  const criticalCount = alerts.filter((alert) => alert.severity === 'critical' && alert.status !== 'resolved').length;
  const warningCount = alerts.filter((alert) => alert.severity === 'warning' && alert.status !== 'resolved').length;
  const resolvedCount = alerts.filter((alert) => alert.status === 'resolved').length;

  const renderSeverity = (severity: string) => (
    <Badge variant={severity === 'critical' ? 'critical' : severity === 'warning' ? 'warning' : 'default'}>
      {severity.toUpperCase()}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono">
          <span className="text-[10px] uppercase text-zinc-400 font-semibold">Active Alerts</span>
          <div className="text-2xl font-bold text-white mt-1">{activeCount}</div>
          <span className="text-[10px] text-zinc-500">Awaiting triage</span>
        </div>
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono">
          <span className="text-[10px] uppercase text-zinc-300 font-semibold">Critical Severity</span>
          <div className="text-2xl font-bold text-white mt-1">{criticalCount}</div>
          <span className="text-[10px] text-zinc-500">Immediate action required</span>
        </div>
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono">
          <span className="text-[10px] uppercase text-zinc-300 font-semibold">Warning Alerts</span>
          <div className="text-2xl font-bold text-white mt-1">{warningCount}</div>
          <span className="text-[10px] text-zinc-500">Threshold trending high</span>
        </div>
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono">
          <span className="text-[10px] uppercase text-zinc-300 font-semibold">Resolved Alerts</span>
          <div className="text-2xl font-bold text-white mt-1">{resolvedCount}</div>
          <span className="text-[10px] text-zinc-500">Resolved or remediated</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <SearchInput
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onClear={() => setSearchTerm('')}
          placeholder="Search alert title, ID, or service..."
          className="w-full sm:w-80"
        />
        <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
          <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800">
            {(['all', 'active', 'acknowledged', 'resolved'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded capitalize transition-colors ${
                  statusFilter === status ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800">
            {(['all', 'critical', 'warning', 'info'] as const).map((severity) => (
              <button
                key={severity}
                onClick={() => setSeverityFilter(severity)}
                className={`px-2.5 py-1 rounded uppercase transition-colors ${
                  severityFilter === severity ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {severity}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="xs" onClick={() => void fetchAlerts()}>
            Refresh
          </Button>
        </div>
      </div>

      <Card noPadding>
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
              Firing Alerts &amp; Threshold Violations ({filteredAlerts.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">Select an alert for diagnostics</span>
        </div>

        {loading ? (
          <div className="p-4"><TableSkeleton rows={5} /></div>
        ) : loadError ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-sm text-red-300">{loadError}</p>
            <Button variant="secondary" size="sm" onClick={() => void fetchAlerts()}>Retry</Button>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            title="No Alerts in Selected View"
            description="There are no alerts matching the current filters."
            actionLabel="Reset Filters"
            onAction={() => {
              setStatusFilter('all');
              setSeverityFilter('all');
              setSearchTerm('');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
                  <th className="py-3 px-4 font-semibold uppercase">Severity</th>
                  <th className="py-3 px-4 font-semibold uppercase">Alert Title &amp; ID</th>
                  <th className="py-3 px-4 font-semibold uppercase">Target Service</th>
                  <th className="py-3 px-4 font-semibold uppercase">Current Value</th>
                  <th className="py-3 px-4 font-semibold uppercase">Threshold Rule</th>
                  <th className="py-3 px-4 font-semibold uppercase">Triggered At</th>
                  <th className="py-3 px-4 font-semibold uppercase">Status</th>
                  <th className="py-3 px-4 font-semibold uppercase text-right">Quick Triage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className="hover:bg-zinc-900/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">{renderSeverity(alert.severity)}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{alert.title}</div>
                      <div className="text-[10px] text-zinc-500">{alert.id}</div>
                    </td>
                    <td className="py-3 px-4 text-zinc-300 font-medium">{alert.service}</td>
                    <td className="py-3 px-4"><span className="font-bold text-white">{String(alert.currentValue)}</span></td>
                    <td className="py-3 px-4 text-zinc-400">{String(alert.threshold)}</td>
                    <td className="py-3 px-4 text-zinc-400">{alert.timestamp}</td>
                    <td className="py-3 px-4"><StatusPill status={alert.status} className="text-[10px]" /></td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
                        {alert.status === 'active' && (
                          <Button
                            variant="secondary"
                            size="xs"
                            disabled={actionInProgress === alert.id}
                            onClick={() => void updateAlertStatus(alert, 'acknowledged')}
                            className="text-[10px]"
                          >
                            ACK
                          </Button>
                        )}
                        {alert.status !== 'resolved' && (
                          <Button
                            variant="primary"
                            size="xs"
                            disabled={actionInProgress === alert.id}
                            onClick={() => void updateAlertStatus(alert, 'resolved')}
                            icon={<Check className="w-3 h-3" />}
                            className="text-[10px]"
                          >
                            RESOLVE
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedAlert && (
        <Modal
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          title={`ALERT DIAGNOSTICS // ${selectedAlert.id}`}
          subtitle={`${selectedAlert.title} — ${selectedAlert.service}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-mono text-zinc-500">Triggered: {selectedAlert.timestamp}</span>
              <div className="flex items-center gap-2">
                {selectedAlert.status === 'active' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={actionInProgress === selectedAlert.id}
                    onClick={() => void updateAlertStatus(selectedAlert, 'acknowledged')}
                  >
                    Acknowledge Alert
                  </Button>
                )}
                {selectedAlert.status !== 'resolved' && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={actionInProgress === selectedAlert.id}
                    onClick={() => void updateAlertStatus(selectedAlert, 'resolved')}
                  >
                    Mark Resolved
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedAlert(null)}>Close</Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-black border border-zinc-800">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase">Alert Severity</span>
                <div className="mt-1">{renderSeverity(selectedAlert.severity)}</div>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] uppercase">Current Lifecycle</span>
                <div className="mt-1"><StatusPill status={selectedAlert.status} /></div>
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase">Threshold Rule Violation</span>
              <p className="text-zinc-200">
                Observed value <strong className="text-white font-bold">{String(selectedAlert.currentValue)}</strong> against rule{' '}
                <strong className="text-zinc-300 font-mono">{String(selectedAlert.threshold)}</strong>.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-700 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold uppercase text-[10px] tracking-wider">
                <ShieldAlert className="w-4 h-4 text-white" />
                Recommended Corrective Action
              </div>
              <p className="text-zinc-200 text-xs leading-relaxed font-sans">
                {selectedAlert.recommendedAction || 'Review the affected service and inspect recent telemetry.'}
              </p>
            </div>
            {selectedAlert.acknowledgedBy && (
              <div className="text-[11px] text-zinc-400 border-t border-zinc-800 pt-2">
                Acknowledged by <strong className="text-white">{selectedAlert.acknowledgedBy}</strong>
                {selectedAlert.acknowledgedAt ? ` at ${selectedAlert.acknowledgedAt}` : ''}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AlertsPage;
