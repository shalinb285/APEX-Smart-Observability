
import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Copy,
  Download,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

import { LogEntry, LogSeverity } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SearchInput } from '../components/ui/SearchInput';
import { TableSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toText = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
};

// Accept arrays and common API response wrappers.
// Never allow an unexpected object to reach Array.map().
const extractLogArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;

  if (!isRecord(value)) return [];

  const possibleKeys = ['logs', 'items', 'results', 'events', 'data'];

  for (const key of possibleKeys) {
    const nested = value[key];

    if (Array.isArray(nested)) return nested;

    if (isRecord(nested)) {
      const result = extractLogArray(nested);
      if (result.length > 0) return result;
    }
  }

  return [];
};

const normalizeLogs = (value: unknown): LogEntry[] => {
  return extractLogArray(value)
    .filter(isRecord)
    .map((item, index) => {
      const rawSeverity = toText(
        item.severity ?? item.level ?? item.log_level,
        'INFO'
      ).toUpperCase();

      const severity: LogSeverity =
        rawSeverity === 'CRITICAL' ||
        rawSeverity === 'ERROR' ||
        rawSeverity === 'WARNING' ||
        rawSeverity === 'INFO'
          ? rawSeverity
          : 'INFO';

      const rawTimestamp =
        item.timestamp ?? item.created_at ?? item.time;

      const timestamp = toText(
        rawTimestamp,
        new Date().toISOString()
      );

      const rawPayload = item.payload ?? item.context ?? item.metadata;

      return {
        id: toText(item.id ?? item.log_id, `log-${index}`),
        timestamp,
        severity,
        service: toText(
          item.service ?? item.service_name ?? item.application,
          'unknown-service'
        ),
        message: toText(
          item.message ?? item.msg ?? item.description,
          'No log message provided'
        ),
        host: toText(item.host ?? item.hostname, 'unknown'),
        environment: toText(
          item.environment ?? item.env,
          'unknown'
        ),
        traceId: toText(
          item.traceId ?? item.trace_id ?? item.traceID,
          ''
        ),
        stackTrace: toText(
          item.stackTrace ?? item.stack_trace,
          ''
        ),
        payload: isRecord(rawPayload) ? rawPayload : undefined,
      } as LogEntry;
    });
};

export const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchLogs = async () => {
      setLoading(true);
      setError('');

      try {
        const response: unknown = await api.getLogs({
          service: selectedService,
          severity: selectedSeverity,
          search: searchTerm,
        });

        const safeLogs = normalizeLogs(response);

        if (!cancelled) {
          setLogs(safeLogs);
          setExpandedLogId(current =>
            current && safeLogs.some(log => log.id === current)
              ? current
              : safeLogs[0]?.id ?? null
          );
        }
      } catch (err) {
        console.error('APEX Logs loading failed:', err);

        if (!cancelled) {
          setLogs([]);
          setError(
            'Unable to load logs from the backend. Please check the API connection.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchLogs();

    return () => {
      cancelled = true;
    };
  }, [selectedService, selectedSeverity, searchTerm]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Unable to copy log:', err);
      setError('Clipboard access failed. Please copy the log manually.');
    }
  };

  const getSeverityBadge = (severity: LogSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge variant="critical">CRITICAL</Badge>;
      case 'ERROR':
        return <Badge variant="critical">ERROR</Badge>;
      case 'WARNING':
        return <Badge variant="warning">WARN</Badge>;
      case 'INFO':
        return <Badge variant="outline">INFO</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  const getRowHighlight = (severity: LogSeverity) => {
    switch (severity) {
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

  const services = [
    'all',
    'payment-gateway',
    'order-service',
    'auth-service',
    'api-gateway',
    'redis-cache',
    'spark-worker-bigdata-01',
  ];

  const exportLogs = () => {
    const content = JSON.stringify(logs, null, 2);
    const blob = new Blob([content], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `apex-logs-${Date.now()}.json`;
    anchor.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <SearchInput
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            onClear={() => setSearchTerm('')}
            placeholder="Search log messages, trace IDs, stack trace keywords..."
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-black border border-zinc-800 px-2.5 py-1 rounded-lg text-xs font-mono">
            <span className="text-zinc-500">SVC:</span>

            <select
              value={selectedService}
              onChange={event => setSelectedService(event.target.value)}
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer"
            >
              {services.map(service => (
                <option
                  key={service}
                  value={service}
                  className="bg-black text-zinc-200"
                >
                  {service.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800 text-xs font-mono">
            {(['all', 'CRITICAL', 'ERROR', 'WARNING', 'INFO'] as const).map(level => (
              <button
                key={level}
                onClick={() => setSelectedSeverity(level)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedSeverity === level
                    ? 'bg-zinc-800 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={exportLogs}
            icon={<Download className="w-3.5 h-3.5" />}
            className="text-xs font-mono"
          >
            EXPORT
          </Button>
        </div>
      </div>

      {/* Logs Table */}
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
        ) : error ? (
          <div className="p-6 text-sm text-red-300 font-mono">
            <p>{error}</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedService('all');
                setSelectedSeverity('all');
              }}
              className="mt-3 underline text-zinc-200"
            >
              Reset filters
            </button>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No Logs Matched Filter"
            description="Try loosening your search query or selecting ALL severity."
            actionLabel="Reset Search"
            onAction={() => {
              setSearchTerm('');
              setSelectedService('all');
              setSelectedSeverity('all');
            }}
          />
        ) : (
          <div className="divide-y divide-zinc-800/80 font-mono text-xs">
            {logs.map(log => {
              const isExpanded = expandedLogId === log.id;

              return (
                <div
                  key={log.id}
                  className={`transition-colors ${getRowHighlight(log.severity)}`}
                >
                  {/* Summary Row */}
                  <div
                    onClick={() =>
                      setExpandedLogId(isExpanded ? null : log.id)
                    }
                    className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-900/60 cursor-pointer select-none"
                  >
                    <button
                      type="button"
                      aria-label={isExpanded ? 'Collapse log' : 'Expand log'}
                      className="text-zinc-500 hover:text-white mt-0.5"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <span className="text-zinc-400 text-[11px] shrink-0 mt-0.5">
                      {log.timestamp}
                    </span>

                    <div className="shrink-0">
                      {getSeverityBadge(log.severity)}
                    </div>

                    <span className="text-zinc-300 font-semibold shrink-0 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700 text-[11px]">
                      {log.service}
                    </span>

                    <p className="text-zinc-200 flex-1 truncate">
                      {log.message}
                    </p>

                    {log.traceId && (
                      <span className="hidden md:inline-block text-[10px] text-zinc-300 bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded shrink-0 font-bold">
                        {log.traceId.slice(0, 10)}...
                      </span>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 space-y-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800">
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                          <span>
                            HOST: <strong className="text-white">{log.host || 'unknown'}</strong>
                          </span>

                          <span>•</span>

                          <span>
                            ENV: <strong className="text-white">{log.environment || 'unknown'}</strong>
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

                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                          Full Message
                        </p>

                        <div className="p-3 rounded-lg bg-black border border-zinc-800 text-zinc-200 text-xs whitespace-pre-wrap leading-relaxed">
                          {log.message}
                        </div>
                      </div>

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

export default LogsPage;
