import React, { useState, useEffect } from 'react';
import {
  Wrench,
  RotateCcw,
  Zap,
  Layers,
  Trash2,
  PlayCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { RemediationAction, RemediationHistoryItem } from '../types';
import { api } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusPill } from '../components/ui/StatusPill';
import { Modal } from '../components/ui/Modal';
import { useMonitoring } from '../context/MonitoringContext';

export const RemediationPage: React.FC = () => {
  const [actions, setActions] = useState<RemediationAction[]>([]);
  const [history, setHistory] = useState<RemediationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModalAction, setConfirmModalAction] = useState<RemediationAction | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>('rem-hist-101');
  const { showNotification, refreshOverview } = useMonitoring();

  const loadRemediationData = async () => {
    setLoading(true);
    try {
      const [acts, hist] = await Promise.all([
        api.getRemediationActions(),
        api.getRemediationHistory(),
      ]);
      setActions(acts);
      setHistory(hist);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRemediationData();
  }, []);

  const handleExecuteConfirmed = async () => {
    if (!confirmModalAction) return;
    setIsExecuting(true);
    try {
      const result = await api.executeRemediation(confirmModalAction.id);
      setHistory((prev) => [result, ...prev]);
      setExpandedLogId(result.id);
      showNotification(`Executed "${confirmModalAction.title}" successfully. Target: ${confirmModalAction.targetService}`, 'success');
      setConfirmModalAction(null);
      await refreshOverview();
    } catch (e) {
      showNotification('Remediation action failed', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const getActionIcon = (type: RemediationAction['type']) => {
    return <Wrench className="w-5 h-5 text-white" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-base font-bold font-mono tracking-tight text-white flex items-center gap-2">
          <Wrench className="w-5 h-5 text-white" />
          AUTOMATED REMEDIATION &amp; RECOVERY PLAYBOOKS
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Execute guarded corrective runbooks, auto-scale pods, drain connections, or rollback releases
        </p>
      </div>

      {/* Available Remediation Actions Catalog */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
            Standard Runbook Actions ({actions.length} Configured)
          </span>
          <span className="text-[11px] font-mono text-zinc-500">
            Safety gates enabled: 2-step confirmation required
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((act) => (
            <Card key={act.id} className="flex flex-col justify-between space-y-4 hover:border-zinc-600 transition-all">
              <div className="space-y-2.5 font-mono">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                    {getActionIcon(act.type)}
                  </div>
                  <Badge variant={act.riskLevel === 'high' ? 'critical' : act.riskLevel === 'medium' ? 'warning' : 'healthy'}>
                    RISK: {act.riskLevel.toUpperCase()}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white leading-snug">{act.title}</h4>
                  <span className="text-[11px] text-zinc-300 font-semibold">
                    Target: {act.targetService}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {act.description}
                </p>

                <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 pt-1">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  Estimated runtime: {act.estimatedDuration}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmModalAction(act)}
                  icon={<PlayCircle className="w-3.5 h-3.5" />}
                  className="w-full text-xs font-mono justify-center hover:bg-zinc-800"
                >
                  TRIGGER RUNBOOK
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Remediation Audit History Table */}
      <Card noPadding>
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-white" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
              Remediation Execution History &amp; Before/After Health
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Immutable audit log with console execution traces
          </span>
        </div>

        <div className="divide-y divide-zinc-800/80 font-mono text-xs">
          {history.map((item) => {
            const isExpanded = expandedLogId === item.id;
            const isSuccess = item.status === 'success';

            return (
              <div key={item.id} className="transition-colors">
                <div
                  onClick={() => setExpandedLogId(isExpanded ? null : item.id)}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-900/60 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-zinc-500 hover:text-white">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <Badge variant={isSuccess ? 'healthy' : 'critical'}>
                      {item.status.toUpperCase()}
                    </Badge>

                    <div>
                      <span className="font-semibold text-white">{item.actionTitle}</span>
                      <div className="text-[11px] text-zinc-400">
                        Target: <span className="text-zinc-200">{item.targetService}</span> | Actor: {item.executedBy}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div className="hidden md:block">
                      <div className="text-[11px] text-zinc-500 line-through">
                        {item.beforeHealth}
                      </div>
                      <div className="text-[11px] text-white font-bold">
                        &rarr; {item.afterHealth}
                      </div>
                    </div>
                    <span className="text-zinc-400 text-[11px] shrink-0">{item.timestamp}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 space-y-2">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-white" />
                      Execution Shell Output Trace
                    </span>
                    <pre className="p-3 rounded-lg bg-black border border-zinc-800 text-zinc-200 text-xs overflow-x-auto leading-relaxed">
                      {item.logOutput}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Safety Confirmation Modal */}
      {confirmModalAction && (
        <Modal
          isOpen={!!confirmModalAction}
          onClose={() => setConfirmModalAction(null)}
          title={`CONFIRM REMEDIATION // ${confirmModalAction.id}`}
          subtitle={`Target: ${confirmModalAction.targetService} | Risk Level: ${confirmModalAction.riskLevel.toUpperCase()}`}
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
              >
                Authorize &amp; Execute
              </Button>
            </>
          }
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-700 flex items-start gap-3 text-zinc-200">
              <AlertTriangle className="w-5 h-5 text-white shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-white">Safety Confirmation Gate</strong>
                Executing this playbook directly modifies container topology or service processes.
                Ensure standby redundancy is active.
              </div>
            </div>

            <div className="p-3 rounded-lg bg-black border border-zinc-800 space-y-1.5">
              <span className="text-zinc-500 uppercase text-[10px]">Action Specification</span>
              <p className="text-sm font-bold text-white">{confirmModalAction.title}</p>
              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                {confirmModalAction.description}
              </p>
            </div>

            <div className="flex items-center justify-between text-zinc-400 text-xs border-t border-zinc-800 pt-2">
              <span>Estimated Duration:</span>
              <span className="text-white font-semibold">{confirmModalAction.estimatedDuration}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
