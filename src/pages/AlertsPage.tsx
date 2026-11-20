import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Filter,
  Check,
  Search,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react';
import { AlertItem, AlertSeverity, AlertStatus } from '../types';
import { api } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusPill } from '../components/ui/StatusPill';
import { SearchInput } from '../components/ui/SearchInput';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/LoadingSkeleton';
import { useMonitoring } from '../context/MonitoringContext';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const { showNotification } = useMonitoring();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts({
        status: statusFilter,
        severity: severityFilter,
      });
      setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, severityFilter]);

  const handleAcknowledge = async (alertItem: AlertItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const updated = await api.updateAlert(alertItem.id, {
        status: 'acknowledged',
        acknowledgedBy: 'Current SRE User',
        acknowledgedAt: new Date().toLocaleTimeString(),
      });
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      if (selectedAlert?.id === updated.id) setSelectedAlert(updated);
      showNotification(`Alert ${alertItem.id} acknowledged`, 'success');
    } catch (err) {
      showNotification('Failed to acknowledge alert', 'error');
    }
  };

  const handleResolve = async (alertItem: AlertItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const updated = await api.updateAlert(alertItem.id, {
        status: 'resolved',
        resolvedAt: new Date().toLocaleTimeString(),
      });
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      if (selectedAlert?.id === updated.id) setSelectedAlert(updated);
      showNotification(`Alert ${alertItem.id} marked as resolved`, 'success');
    } catch (err) {
      showNotification('Failed to resolve alert', 'error');
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    return (
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const activeCount = alerts.filter((a) => a.status === 'active').length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning' && a.status !== 'resolved').length;
  const resolvedCount = alerts.filter((a) => a.status === 'resolved').length;

  return (
    <div className="space-y-6">
      {/* Top Counters Bar */}
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
          <span className="text-[10px] uppercase text-zinc-300 font-semibold">Resolved Today</span>
          <div className="text-2xl font-bold text-white mt-1">{resolvedCount}</div>
          <span className="text-[10px] text-zinc-500">Auto &amp; manual remediations</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClear={() => setSearchTerm('')}
          placeholder="Search alert title, ID, or service..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800">
            {(['all', 'active', 'acknowledged', 'resolved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded capitalize transition-colors ${
                  statusFilter === st ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Severity filter tabs */}
          <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800">
            {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded uppercase transition-colors ${
                  severityFilter === sev ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alert List Table */}
      <Card noPadding>
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
              Firing Alerts &amp; Threshold Violations ({filteredAlerts.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Click alert row for recommended remediation
          </span>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            title="No Alerts in Selected View"
            description="All monitored thresholds are currently within nominal limits."
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
                    <td className="py-3 px-4">
                      <Badge variant={alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'default'}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-white transition-colors">
                        {alert.title}
                      </div>
                      <div className="text-[10px] text-zinc-500">{alert.id}</div>
                    </td>

                    <td className="py-3 px-4 text-zinc-300 font-medium">{alert.service}</td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-white">{alert.currentValue}</span>
                    </td>

                    <td className="py-3 px-4 text-zinc-400">{alert.threshold}</td>

                    <td className="py-3 px-4 text-zinc-400">{alert.timestamp}</td>

                    <td className="py-3 px-4">
                      <StatusPill status={alert.status} className="text-[10px]" />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {alert.status === 'active' && (
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={(e) => handleAcknowledge(alert, e)}
                            className="text-[10px]"
                          >
                            ACK
                          </Button>
                        )}
                        {alert.status !== 'resolved' && (
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={(e) => handleResolve(alert, e)}
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

      {/* Alert Detail Modal with Recommended Actions */}
      {selectedAlert && (
        <Modal
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          title={`ALERT DIAGNOSTICS // ${selectedAlert.id}`}
          subtitle={`${selectedAlert.title} — ${selectedAlert.service}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-mono text-zinc-500">
                Triggered: {selectedAlert.timestamp}
              </span>
              <div className="flex items-center gap-2">
                {selectedAlert.status === 'active' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAcknowledge(selectedAlert)}
                  >
                    Acknowledge Alert
                  </Button>
                )}
                {selectedAlert.status !== 'resolved' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleResolve(selectedAlert)}
                  >
                    Mark Resolved
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedAlert(null)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 font-mono text-xs">
            {/* Severity & State */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-black border border-zinc-800">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase">Alert Severity</span>
                <div className="mt-1">
                  <Badge variant={selectedAlert.severity === 'critical' ? 'critical' : 'warning'}>
                    {selectedAlert.severity.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] uppercase">Current Lifecycle</span>
                <div className="mt-1">
                  <StatusPill status={selectedAlert.status} />
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase">Threshold Rule Violation</span>
              <p className="text-zinc-200">
                Observed value <strong className="text-white font-bold">{selectedAlert.currentValue}</strong> exceeded rule{' '}
                <strong className="text-zinc-300 font-mono">{selectedAlert.threshold}</strong>.
              </p>
            </div>

            {/* AI Recommended Remediation Action */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-700 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold uppercase text-[10px] tracking-wider">
                <ShieldAlert className="w-4 h-4 text-white" />
                AI Recommended Corrective Action
              </div>
              <p className="text-zinc-200 text-xs leading-relaxed font-sans">
                {selectedAlert.recommendedAction}
              </p>
            </div>

            {selectedAlert.acknowledgedBy && (
              <div className="text-[11px] text-zinc-400 border-t border-zinc-800 pt-2">
                Acknowledged by <strong className="text-white">{selectedAlert.acknowledgedBy}</strong> at{' '}
                {selectedAlert.acknowledgedAt}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
