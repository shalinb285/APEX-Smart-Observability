import React, { useState, useEffect } from 'react';
import {
  Network,
  Activity,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Layers,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  Database,
  Server,
  Zap,
} from 'lucide-react';
import { DistributedTrace, ServiceNode, ServiceEdge, TraceSpan } from '../types';
import { api } from '../services/api';
import {
  mockDistributedTraces,
  mockServiceNodes,
  mockServiceEdges,
} from '../services/mockData';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusPill } from '../components/ui/StatusPill';
import { SearchInput } from '../components/ui/SearchInput';
import { Modal } from '../components/ui/Modal';

export const TracingPage: React.FC = () => {
  const [traces, setTraces] = useState<DistributedTrace[]>(mockDistributedTraces);
  const [selectedTrace, setSelectedTrace] = useState<DistributedTrace>(mockDistributedTraces[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [activeSpan, setActiveSpan] = useState<TraceSpan | null>(null);

  const filteredTraces = traces.filter((t) => {
    const matchesSearch =
      t.traceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.rootService.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-mono tracking-tight text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-white" />
            DISTRIBUTED TRACING &amp; SERVICE TOPOLOGY
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            End-to-end request flows, microservice dependency graphs, and latency waterfalls
          </p>
        </div>
      </div>

      {/* Visual Service Topology Diagram Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <Network className="w-4 h-4 text-white" />
              Service Dependency Topology (Live Traffic Mesh)
            </CardTitle>
            <CardDescription>
              Real-time service interactions, RPS, latency, and error rate across microservices
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]" /> Healthy
            </span>
            <span className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-zinc-500" /> Warning
            </span>
            <span className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-black ring-1 ring-white" /> Critical
            </span>
          </div>
        </CardHeader>

        {/* Visual interactive topology SVG mesh (Strictly Monochrome) */}
        <div className="relative w-full h-[320px] bg-black rounded-xl border border-zinc-800 overflow-hidden p-4">
          <svg className="w-full h-full" viewBox="0 0 850 360">
            <defs>
              <marker id="arrowMono" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#A1A1AA" />
              </marker>
              <marker id="arrowWhite" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#FFFFFF" />
              </marker>
            </defs>

            {/* Connecting Dependency Edges */}
            {mockServiceEdges.map((edge, i) => {
              const src = mockServiceNodes.find((n) => n.id === edge.from);
              const dst = mockServiceNodes.find((n) => n.id === edge.to);
              if (!src || !dst) return null;

              const isError = edge.errorRate > 2.0;

              return (
                <g key={`edge-${i}`}>
                  <line
                    x1={src.x + 45}
                    y1={src.y + 20}
                    x2={dst.x + 45}
                    y2={dst.y + 20}
                    stroke={isError ? '#FFFFFF' : '#3F3F46'}
                    strokeWidth={isError ? 2 : 1.2}
                    strokeDasharray={isError ? '5 5' : 'none'}
                    markerEnd={isError ? 'url(#arrowWhite)' : 'url(#arrowMono)'}
                    className="transition-all"
                  />
                  {/* Floating edge badge */}
                  <rect
                    x={(src.x + dst.x) / 2 + 30}
                    y={(src.y + dst.y) / 2 + 10}
                    width={56}
                    height={16}
                    rx={4}
                    fill="#000000"
                    stroke={isError ? '#FFFFFF' : '#27272A'}
                    strokeWidth={1}
                  />
                  <text
                    x={(src.x + dst.x) / 2 + 58}
                    y={(src.y + dst.y) / 2 + 22}
                    textAnchor="middle"
                    fill={isError ? '#FFFFFF' : '#A1A1AA'}
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {edge.latencyMs}ms
                  </text>
                </g>
              );
            })}

            {/* Service Nodes */}
            {mockServiceNodes.map((node) => {
              const isCrit = node.health === 'critical';
              const strokeColor = isCrit ? '#FFFFFF' : '#52525B';

              return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`} className="cursor-pointer">
                  {/* Outer Glow */}
                  <rect
                    x={0}
                    y={0}
                    width={110}
                    height={46}
                    rx={8}
                    fill="#09090B"
                    stroke={strokeColor}
                    strokeWidth={isCrit ? 2 : 1.2}
                    className="filter drop-shadow-md hover:fill-zinc-900 transition-colors"
                  />
                  {/* Status dot */}
                  <circle cx={14} cy={16} r={4} fill={isCrit ? '#FFFFFF' : '#A1A1AA'} />
                  {/* Node Name */}
                  <text x={26} y={19} fill="#FFFFFF" fontSize="11" fontWeight="600" fontFamily="monospace">
                    {node.name}
                  </text>
                  {/* Metrics Subtitle */}
                  <text x={14} y={36} fill="#A1A1AA" fontSize="9" fontFamily="monospace">
                    {node.rps} rps | {node.latencyMs}ms
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </Card>

      {/* Distributed Trace Explorer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Trace List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center gap-2">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
              placeholder="Search trace ID or route..."
              className="w-full"
            />
            <div className="flex items-center bg-black p-1 rounded-lg border border-zinc-800 text-xs font-mono shrink-0">
              {(['all', 'error', 'success'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-1 rounded capitalize ${
                    statusFilter === st ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredTraces.map((trace) => {
              const isSelected = selectedTrace?.traceId === trace.traceId;
              const isError = trace.status === 'error';

              return (
                <div
                  key={trace.traceId}
                  onClick={() => setSelectedTrace(trace)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none font-mono text-xs ${
                    isSelected
                      ? 'bg-zinc-900 border-white shadow-glow-white'
                      : 'bg-[#09090B] border-zinc-800 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-white tracking-wide truncate">
                      {trace.endpoint}
                    </span>
                    <Badge variant={isError ? 'critical' : 'healthy'}>
                      {trace.httpStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
                    <span className="text-zinc-300 font-semibold">{trace.traceId}</span>
                    <span className="font-semibold text-white">
                      {trace.totalDurationMs} ms
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
                    <span>{trace.spanCount} spans</span>
                    <span>{trace.timestamp}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Latency Waterfall Breakdown (7 cols) */}
        <div className="lg:col-span-7">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>
                  <Layers className="w-4 h-4 text-white" />
                  Latency Waterfall // {selectedTrace?.traceId}
                </CardTitle>
                <CardDescription>
                  {selectedTrace?.endpoint} — Total: {selectedTrace?.totalDurationMs}ms across {selectedTrace?.spanCount} spans
                </CardDescription>
              </div>
              <Badge variant={selectedTrace?.status === 'error' ? 'critical' : 'healthy'}>
                HTTP {selectedTrace?.httpStatus}
              </Badge>
            </CardHeader>

            {/* Waterfall Timeline Spans */}
            <div className="space-y-3 font-mono text-xs">
              {/* Timeline Header Scale */}
              <div className="flex items-center justify-between text-[10px] text-zinc-400 pb-1 border-b border-zinc-800">
                <span>0 ms</span>
                <span>{(selectedTrace.totalDurationMs * 0.25).toFixed(0)} ms</span>
                <span>{(selectedTrace.totalDurationMs * 0.5).toFixed(0)} ms</span>
                <span>{(selectedTrace.totalDurationMs * 0.75).toFixed(0)} ms</span>
                <span>{selectedTrace.totalDurationMs} ms</span>
              </div>

              {/* Spans List */}
              <div className="space-y-2.5">
                {selectedTrace.spans.map((span) => {
                  const leftPercent = (span.offsetMs / selectedTrace.totalDurationMs) * 100;
                  const widthPercent = Math.max(
                    3,
                    (span.durationMs / selectedTrace.totalDurationMs) * 100
                  );
                  const isSpanError = span.status === 'error';

                  return (
                    <div
                      key={span.id}
                      onClick={() => setActiveSpan(span)}
                      className="p-2.5 rounded-lg bg-black border border-zinc-800 hover:border-zinc-500 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-200 border border-zinc-700">
                            {span.service}
                          </span>
                          <span className="text-zinc-200 font-medium truncate group-hover:text-white">
                            {span.operation}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-white">
                          {span.durationMs} ms
                        </span>
                      </div>

                      {/* Visual Bar */}
                      <div className="relative w-full h-3 bg-zinc-900 rounded overflow-hidden">
                        <div
                          className={`absolute top-0 bottom-0 rounded transition-all ${
                            isSpanError
                              ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                              : 'bg-zinc-400'
                          }`}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Span Details Modal */}
      {activeSpan && (
        <Modal
          isOpen={!!activeSpan}
          onClose={() => setActiveSpan(null)}
          title={`SPAN DETAILS // ${activeSpan.operation}`}
          subtitle={`Service: ${activeSpan.service} | Duration: ${activeSpan.durationMs}ms`}
          maxWidth="lg"
          footer={
            <Button variant="secondary" size="sm" onClick={() => setActiveSpan(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-black border border-zinc-800">
              <span className="text-zinc-400">Execution Status</span>
              <StatusPill status={activeSpan.status} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-black border border-zinc-800">
                <span className="text-zinc-500 text-[10px] uppercase">Span Offset</span>
                <p className="text-white font-bold">{activeSpan.offsetMs} ms</p>
              </div>
              <div className="p-3 rounded-lg bg-black border border-zinc-800">
                <span className="text-zinc-500 text-[10px] uppercase">Duration</span>
                <p className="text-white font-bold">{activeSpan.durationMs} ms</p>
              </div>
            </div>

            {activeSpan.tags && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
                  Span Semantic Tags
                </p>
                <div className="p-3 rounded-lg bg-black border border-zinc-800 space-y-1">
                  {Object.entries(activeSpan.tags).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-zinc-400">{k}:</span>
                      <span className="text-white font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
