import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Search,
  Filter,
  AlertTriangle,
  Flame,
  Info,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Copy,
  ExternalLink,
  Download,
  Calendar,
  Layers,
} from 'lucide-react';
import { LogEntry, LogSeverity } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SearchInput } from '../components/ui/SearchInput';
import { TableSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';

export const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>('log-001');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const data = await api.getLogs({
          service: selectedService,
          severity: selectedSeverity,
          search: searchTerm,
        });
        setLogs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [selectedService, selectedSeverity, searchTerm]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSeverityBadge = (sev: LogSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return <Badge variant="critical">CRITICAL</Badge>;
      case 'ERROR':
        return <Badge variant="critical">ERROR</Badge>;
      case 'WARNING':
        return <Badge variant="warning">WARN</Badge>;
      case 'INFO':
        return <Badge variant="outline">INFO</Badge>;
      default:
        return <Badge>{sev}</Badge>;
    }
  };

  const getRowHighlight = (sev: LogSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-zinc-900/60 border-l-2 border-l-white';
      case 'ERROR':
        return 'bg-zinc-900/40 border-l-2 border-l-zinc-400';
      case 'WARNING':
        return 'bg-zinc-900/20 border-l-2 border-l-zinc-600';
      default:
        return 'border-l-2 border-l-transparent';
    }
  };

  const services = ['all', 'payment-gateway', 'order-service', 'auth-service', 'api-gateway', 'redis-cache', 'spark-worker-bigdata-01'];

  return (
    <div className="space-y-6">
      {/* Top Filter Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
            placeholder="Search log messages, trace IDs, stack trace keywords..."
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Service Dropdown */}
          <div className="flex items-center gap-1.5 bg-black border border-zinc-800 px-2.5 py-1 rounded-lg text-xs font-mono">
            <span className="text-zinc-500">SVC:</span>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer"
            >
              {services.map((s) => (
                <option key={s} value={s} className="bg-black text-zinc-200">
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Badges */}
          <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800 text-xs font-mono">
            {(['all', 'CRITICAL', 'ERROR', 'WARNING', 'INFO'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedSeverity(lvl)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedSeverity === lvl
                    ? 'bg-zinc-800 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Download Logs Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const text = JSON.stringify(logs, null, 2);
              const blob = new Blob([text], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `logs-export-${Date.now()}.json`;
              a.click();
            }}
            icon={<Download className="w-3.5 h-3.5" />}
            className="text-xs font-mono"
          >
            EXPORT
          </Button>
        </div>
      </div>

      {/* Main Logs Table and Viewer */}
      <Card noPadding className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-white" />
            <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
              Live Log Stream ({logs.length} events buffered)
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Click row to toggle JSON payload &amp; stack trace
          </span>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={8} />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No Logs Matched Filter"
            description="Try loosening your search query or selecting 'ALL' severity."
            actionLabel="Reset Search"
            onAction={() => {
              setSearchTerm('');
              setSelectedService('all');
              setSelectedSeverity('all');
            }}
          />
        ) : (
          <div className="divide-y divide-zinc-800/80 font-mono text-xs">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div key={log.id} className={`transition-colors ${getRowHighlight(log.severity)}`}>
                  {/* Log Summary Row */}
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-900/60 cursor-pointer select-none"
                  >
                    <button className="text-zinc-500 hover:text-white mt-0.5">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {/* Timestamp */}
                    <span className="text-zinc-400 text-[11px] shrink-0 mt-0.5">
                      {log.timestamp}
                    </span>

                    {/* Severity */}
                    <div className="shrink-0">{getSeverityBadge(log.severity)}</div>

                    {/* Service */}
                    <span className="text-zinc-300 font-semibold shrink-0 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700 text-[11px]">
                      {log.service}
                    </span>

                    {/* Message Preview */}
                    <p className="text-zinc-200 flex-1 truncate">{log.message}</p>

                    {/* Trace ID indicator */}
                    {log.traceId && (
                      <span className="hidden md:inline-block text-[10px] text-zinc-300 bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded shrink-0 font-bold">
                        {log.traceId.slice(0, 10)}...
                      </span>
                    )}
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 space-y-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800">
                        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                          <span>
                            HOST: <strong className="text-white">{log.host || 'unknown'}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            ENV: <strong className="text-white">{log.environment}</strong>
                          </span>
                          {log.traceId && (
                            <>
                              <span>•</span>
                              <span>
                                TRACE ID: <strong className="text-white">{log.traceId}</strong>
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => copyToClipboard(log.message, log.id)}
                            icon={<Copy className="w-3 h-3" />}
                            className="text-[11px]"
                          >
                            {copiedId === log.id ? 'COPIED' : 'COPY LOG'}
                          </Button>
                        </div>
                      </div>

                      {/* Full Message */}
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                          Full Message
                        </p>
                        <div className="p-3 rounded-lg bg-black border border-zinc-800 text-zinc-200 text-xs whitespace-pre-wrap leading-relaxed">
                          {log.message}
                        </div>
                      </div>

                      {/* Stack Trace (if present) */}
                      {log.stackTrace && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-zinc-300 font-semibold mb-1">
                            Exception Stack Trace
                          </p>
                          <pre className="p-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-[11px] overflow-x-auto leading-relaxed">
                            {log.stackTrace}
                          </pre>
                        </div>
                      )}

                      {/* Structured JSON Payload (if present) */}
                      {log.payload && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                            JSON Context Metadata
                          </p>
                          <pre className="p-3 rounded-lg bg-black border border-zinc-800 text-zinc-300 text-[11px] overflow-x-auto">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
