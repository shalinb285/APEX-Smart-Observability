import React, { useCallback, useEffect, useState } from 'react';
import {
  Wrench,
  PlayCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import type { RemediationAction, RemediationHistoryItem } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useMonitoring } from '../context/MonitoringContext';

/**
 * API responses may be a direct array or an envelope such as
 * { data: [...] }, { items: [...] }, or { results: [...] }.
 * Never pass an unknown API response directly to Array.map().
 */
function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['items', 'results', 'actions', 'history', 'data']) {
      const nested = record[key];
      if (Array.isArray(nested)) return nested as T[];
      if (nested && typeof nested === 'object') {
        const extracted = asArray<T>(nested);
        if (extracted.length > 0) return extracted;
      }
    }
  }
  return [];
}

const safeText = (value: unknown, fallback = '—'): string => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return fallback;
};

const safeRisk = (value: unknown): 'high' | 'medium' | 'low' => {
  const risk = String(value ?? 'low').toLowerCase();
  if (risk === 'high' || risk === 'critical') return 'high';
  if (risk === 'medium' || risk === 'warning') return 'medium';
  return 'low';
};

const riskBadgeVariant = (risk: unknown): 'critical' | 'warning' | 'healthy' => {
  const normalized = safeRisk(risk);
  return normalized === 'high' ? 'critical' : normalized === 'medium' ? 'warning' : 'healthy';
};

export const RemediationPage: React.FC = () => {
  const [actions, setActions] = useState<RemediationAction[]>([]);
  const [history, setHistory] = useState<RemediationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState<RemediationAction | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const { showNotification, refreshOverview } = useMonitoring();

  const loadRemediationData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [actionsResponse, historyResponse] = await Promise.all([
        api.getRemediationActions(),
        api.getRemediationHistory(),
      ]);

      const safeActions = asArray<RemediationAction>(actionsResponse);
      const safeHistory = asArray<RemediationHistoryItem>(historyResponse);
      setActions(safeActions);
      setHistory(safeHistory);
      setExpandedLogId((current) => current ?? safeHistory[0]?.id ?? null);
    } catch (error) {
      console.error('Failed to load remediation data:', error);
      setActions([]);
      setHistory([]);
      setLoadError('Could not load remediation data from the backend. You can retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRemediationData();
  }, [loadRemediationData]);

  const handleExecuteConfirmed = async () => {
    if (!confirmModalAction || isExecuting) return;
    setIsExecuting(true);
    try {
      const result = await api.executeRemediation(confirmModalAction.id);
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        const newItem = result as RemediationHistoryItem;
        setHistory((previous) => [newItem, ...previous]);
        if (newItem.id) setExpandedLogId(newItem.id);
      } else {
        await loadRemediationData();
      }

      showNotification(
        `Remediation request submitted: ${safeText(confirmModalAction.title, 'Runbook')}`,
        'success',
      );
      setConfirmModalAction(null);
      try {
        await refreshOverview();
      } catch (refreshError) {
        console.warn('Overview refresh after remediation failed:', refreshError);
      }
    } catch (error) {
      console.error('Remediation execution failed:', error);
      showNotification('Remediation action failed. Check backend logs and try again.', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold font-mono tracking-tight text-white">
            <Wrench className="h-5 w-5 text-white" />
            AUTOMATED REMEDIATION &amp; RECOVERY PLAYBOOKS
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Execute guarded corrective runbooks, auto-scale pods, drain connections, or rollback releases.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void loadRemediationData()} disabled={loading}>
          <span className="inline-flex items-center gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </span>
        </Button>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-300">
            Standard Runbook Actions ({actions.length} Configured)
          </span>
          <span className="text-[11px] font-mono text-zinc-500">
            Safety gates enabled: 2-step confirmation required
          </span>
        </div>

        {loading ? (
          <Card>
            <p className="text-sm text-zinc-400">Loading remediation runbooks…</p>
          </Card>
        ) : loadError ? (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-amber-300">{loadError}</p>
              <Button variant="secondary" size="sm" onClick={() => void loadRemediationData()}>
                Retry
              </Button>
            </div>
          </Card>
        ) : actions.length === 0 ? (
          <Card>
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              No remediation runbooks are currently available.
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {actions.map((action, index) => {
              const id = safeText(action?.id, `runbook-${index}`);
              const risk = safeRisk(action?.riskLevel);
              return (
                <Card key={id} className="flex flex-col justify-between space-y-4 transition-all hover:border-zinc-600">
                  <div className="space-y-2.5 font-mono">
                    <div className="flex items-start justify-between gap-2">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-2">
                        <Wrench className="h-5 w-5 text-white" />
                      </div>
                      <Badge variant={riskBadgeVariant(risk)}>RISK: {risk.toUpperCase()}</Badge>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold leading-snug text-white">
                        {safeText(action?.title, 'Untitled runbook')}
                      </h4>
                      <span className="text-[11px] font-semibold text-zinc-300">
                        Target: {safeText(action?.targetService)}
                      </span>
                    </div>
                    <p className="font-sans text-xs leading-relaxed text-zinc-300">
                      {safeText(action?.description, 'No description provided.')}
                    </p>
                    <div className="flex items-center gap-1.5 pt-1 text-[10px] text-zinc-400">
                      <Clock className="h-3 w-3" />
                      Estimated runtime: {safeText(action?.estimatedDuration)}
                    </div>
                  </div>
                  <div className="flex items-center justify-end border-t border-zinc-800 pt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setConfirmModalAction(action)}
                      icon={<PlayCircle className="h-3.5 w-3.5" />}
                      className="w-full justify-center text-xs font-mono hover:bg-zinc-800"
                    >
                      TRIGGER RUNBOOK
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Card noPadding>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-black px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-white" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
              Remediation Execution History &amp; Before/After Health
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">Execution traces and audit history</span>
        </div>

        <div className="divide-y divide-zinc-800/80 font-mono text-xs">
          {loading ? (
            <p className="px-5 py-6 text-zinc-400">Loading execution history…</p>
          ) : history.length === 0 ? (
            <p className="px-5 py-6 text-zinc-400">No remediation executions have been recorded.</p>
          ) : (
            history.map((item, index) => {
              const id = safeText(item?.id, `history-${index}`);
              const isExpanded = expandedLogId === id;
              const status = safeText(item?.status, 'unknown');
              const isSuccess = status.toLowerCase() === 'success';
              return (
                <div key={id} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => setExpandedLogId(isExpanded ? null : id)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-900/60"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                      )}
                      <Badge variant={isSuccess ? 'healthy' : 'critical'}>{status.toUpperCase()}</Badge>
                      <div className="min-w-0">
                        <span className="block truncate font-semibold text-white">
                          {safeText(item?.actionTitle, 'Remediation action')}
                        </span>
                        <div className="text-[11px] text-zinc-400">
                          Target: <span className="text-zinc-200">{safeText(item?.targetService)}</span>
                          {' | '}Actor: {safeText(item?.executedBy)}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-6 text-right">
                      <div className="hidden md:block">
                        <div className="text-[11px] text-zinc-500 line-through">{safeText(item?.beforeHealth)}</div>
                        <div className="text-[11px] font-bold text-white">→ {safeText(item?.afterHealth)}</div>
                      </div>
                      <span className="text-[11px] text-zinc-400">{safeText(item?.timestamp)}</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="space-y-2 border-t border-zinc-800 bg-zinc-950 px-6 py-4">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        <Terminal className="h-3.5 w-3.5 text-white" />
                        Execution Output Trace
                      </span>
                      <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-black p-3 text-xs leading-relaxed text-zinc-200">
                        {safeText(item?.logOutput, 'No execution output was recorded.')}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {confirmModalAction && (
        <Modal
          isOpen={Boolean(confirmModalAction)}
          onClose={() => !isExecuting && setConfirmModalAction(null)}
          title={`CONFIRM REMEDIATION // ${safeText(confirmModalAction.id)}`}
          subtitle={`Target: ${safeText(confirmModalAction.targetService)} | Risk Level: ${safeRisk(confirmModalAction.riskLevel).toUpperCase()}`}
          maxWidth="md"
          footer={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmModalAction(null)}
                disabled={isExecuting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isExecuting}
                onClick={handleExecuteConfirmed}
                disabled={isExecuting}
              >
                Authorize &amp; Execute
              </Button>
            </>
          }
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900 p-3.5 text-zinc-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <strong className="block font-bold text-white">Safety Confirmation Gate</strong>
                This runbook may modify service or infrastructure state. Confirm that you intend to execute it.
              </div>
            </div>
            <div className="space-y-1.5 rounded-lg border border-zinc-800 bg-black p-3">
              <span className="text-[10px] uppercase text-zinc-500">Action Specification</span>
              <p className="text-sm font-bold text-white">{safeText(confirmModalAction.title)}</p>
              <p className="font-sans text-xs leading-relaxed text-zinc-300">
                {safeText(confirmModalAction.description, 'No description provided.')}
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-800 pt-2 text-xs text-zinc-400">
              <span>Estimated Duration:</span>
              <span className="font-semibold text-white">{safeText(confirmModalAction.estimatedDuration)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RemediationPage;
