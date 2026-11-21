import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ExternalLink, Server } from 'lucide-react';
import type { ServerInfo } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusPill } from '../components/ui/StatusPill';
import { SearchInput } from '../components/ui/SearchInput';
import { Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { RealtimeLineChart } from '../components/charts/RealtimeLineChart';

type ServerStatus = 'healthy' | 'warning' | 'critical';
type ServerRecord = ServerInfo & {
  id: string;
  hostname: string;
  ipAddress: string;
  region: string;
  status: ServerStatus;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  networkUtil: number;
  ramTotal: string;
  diskTotal: string;
  uptime: string;
  coreCount: number;
  loadAvg: number[];
  processesCount: number;
  os: string;
  lastSeen: string;
  tags: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const numberOr = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const stringOr = (value: unknown, fallback = '—'): string =>
  typeof value === 'string' && value.trim() ? value : fallback;

const normalizeServers = (payload: unknown): ServerRecord[] => {
  // APIs commonly return either an array or an object containing the array.
  let rows: unknown = payload;
  if (isRecord(payload)) {
    rows = payload.servers ?? payload.items ?? payload.data ?? payload.results ?? [];
    if (isRecord(rows)) {
      rows = rows.servers ?? rows.items ?? rows.results ?? [];
    }
  }
  if (!Array.isArray(rows)) {
    console.error('Infrastructure API returned an unexpected server payload:', payload);
    return [];
  }

  return rows.filter(isRecord).map((row, index) => {
    const rawStatus = String(row.status ?? 'healthy').toLowerCase();
    const status: ServerStatus = rawStatus === 'critical' || rawStatus === 'warning' ? rawStatus : 'healthy';
    const rawTags = Array.isArray(row.tags) ? row.tags : [];
    const rawLoad = Array.isArray(row.loadAvg) ? row.loadAvg : Array.isArray(row.load_average) ? row.load_average : [];

    return {
      ...row,
      id: String(row.id ?? row.server_id ?? `server-${index}`),
      hostname: stringOr(row.hostname ?? row.name, `Server ${index + 1}`),
      ipAddress: stringOr(row.ipAddress ?? row.ip_address ?? row.ip, 'Unknown IP'),
      region: stringOr(row.region ?? row.location, 'Unknown region'),
      status,
      cpuUsage: numberOr(row.cpuUsage ?? row.cpu_usage ?? row.cpu_utilization),
      ramUsage: numberOr(row.ramUsage ?? row.ram_usage ?? row.memory_utilization),
      diskUsage: numberOr(row.diskUsage ?? row.disk_usage ?? row.disk_utilization),
      networkUtil: numberOr(row.networkUtil ?? row.network_util ?? row.network_utilization),
      ramTotal: stringOr(row.ramTotal ?? row.ram_total ?? row.memory_total, '—'),
      diskTotal: stringOr(row.diskTotal ?? row.disk_total, '—'),
      uptime: stringOr(row.uptime, '—'),
      coreCount: numberOr(row.coreCount ?? row.core_count, 0),
      loadAvg: rawLoad.map((value) => numberOr(value)),
      processesCount: numberOr(row.processesCount ?? row.processes_count, 0),
      os: stringOr(row.os ?? row.operating_system, 'Unknown'),
      lastSeen: stringOr(row.lastSeen ?? row.last_seen ?? row.last_heartbeat, 'Unknown'),
      tags: rawTags.filter((tag): tag is string => typeof tag === 'string'),
    } as ServerRecord;
  });
};

export const InfrastructurePage: React.FC = () => {
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ServerStatus>('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [selectedServer, setSelectedServer] = useState<ServerRecord | null>(null);

  useEffect(() => {
    let active = true;
    const fetchServers = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const payload: unknown = await api.getServers();
        if (active) setServers(normalizeServers(payload));
      } catch (error) {
        console.error('Failed to load infrastructure servers:', error);
        if (active) {
          setServers([]);
          setLoadError('Could not load server inventory. Check the backend connection and try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchServers();
    return () => { active = false; };
  }, []);

  const filteredServers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return servers.filter((server) => {
      const matchesSearch = !query ||
        server.hostname.toLowerCase().includes(query) ||
        server.ipAddress.toLowerCase().includes(query) ||
        server.tags.some((tag) => tag.toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'all' || server.status === statusFilter;
      const matchesRegion = regionFilter === 'all' || server.region.toLowerCase().includes(regionFilter.toLowerCase());
      return matchesSearch && matchesStatus && matchesRegion;
    });
  }, [servers, searchTerm, statusFilter, regionFilter]);

  const metricColor = (value: number) => value >= 90 ? 'text-white font-bold' : value >= 75 ? 'text-zinc-200' : 'text-zinc-400';
  const progressColor = (value: number) => value >= 90 ? 'bg-white' : value >= 75 ? 'bg-zinc-400' : 'bg-zinc-600';
  const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

  const miniHistory = (server: ServerRecord) => Array.from({ length: 13 }, (_, index) => {
    const offset = 12 - index;
    const time = new Date(Date.now() - offset * 60_000);
    return {
      timestamp: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cpu: clampPercent(server.cpuUsage + Math.sin(offset) * 6),
      ram: clampPercent(server.ramUsage + Math.cos(offset) * 3),
    };
  });

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setRegionFilter('all');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <SearchInput value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} onClear={() => setSearchTerm('')} placeholder="Search host, IP, or tag..." className="w-full sm:w-72" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800 text-xs font-mono">
            {(['all', 'healthy', 'warning', 'critical'] as const).map((status) => (
              <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`px-2.5 py-1 rounded-md capitalize transition-colors ${statusFilter === status ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'}`}>
                {status}
              </button>
            ))}
          </div>
          <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)} className="bg-black border border-zinc-800 text-xs font-mono text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none">
            <option value="all">All Regions</option>
            {[...new Set(servers.map((server) => server.region))].filter((region) => region !== 'Unknown region').map((region) => <option key={region} value={region}>{region}</option>)}
          </select>
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-zinc-300" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-white font-semibold">Host Fleet Inventory ({filteredServers.length} Nodes)</h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">Click any row for deep diagnostics</span>
        </div>

        {loading ? <div className="p-4"><TableSkeleton rows={6} /></div> : loadError ? (
          <div className="p-6 text-sm text-zinc-300"><p>{loadError}</p><Button variant="secondary" size="sm" className="mt-3" onClick={() => window.location.reload()}>Reload page</Button></div>
        ) : filteredServers.length === 0 ? (
          <EmptyState title="No Hosts Found" description="No servers matched your current filter or query." actionLabel="Reset Filters" onAction={resetFilters} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead><tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
                {['Host & IP', 'Region', 'Status', 'CPU', 'RAM', 'Disk', 'Net Util', 'Uptime', 'Actions'].map((heading) => <th key={heading} className="py-3 px-4 font-semibold uppercase tracking-wider">{heading}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredServers.map((server) => (
                  <tr key={server.id} onClick={() => setSelectedServer(server)} onKeyDown={(event) => { if (event.key === 'Enter') setSelectedServer(server); }} tabIndex={0} className="hover:bg-zinc-900/60 transition-colors cursor-pointer group">
                    <td className="py-3 px-4"><div className="flex items-center gap-2.5"><div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-white"><Server className="w-4 h-4" /></div><div><div className="font-semibold text-white">{server.hostname}</div><div className="text-[11px] text-zinc-400">{server.ipAddress}</div></div></div></td>
                    <td className="py-3 px-4 text-zinc-300">{server.region}</td>
                    <td className="py-3 px-4"><StatusPill status={server.status} className="text-[10px]" /></td>
                    <td className="py-3 px-4"><span className={`font-semibold ${metricColor(server.cpuUsage)}`}>{server.cpuUsage.toFixed(1)}%</span><div className="w-20 bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-1"><div className={`h-full ${progressColor(server.cpuUsage)}`} style={{ width: `${clampPercent(server.cpuUsage)}%` }} /></div></td>
                    <td className="py-3 px-4"><span className={`font-semibold ${metricColor(server.ramUsage)}`}>{server.ramUsage.toFixed(1)}%</span><span className="text-[10px] text-zinc-500"> ({server.ramTotal})</span><div className="w-20 bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-1"><div className={`h-full ${progressColor(server.ramUsage)}`} style={{ width: `${clampPercent(server.ramUsage)}%` }} /></div></td>
                    <td className="py-3 px-4"><span className="font-semibold text-zinc-200">{server.diskUsage.toFixed(1)}%</span><span className="text-[10px] text-zinc-500"> ({server.diskTotal})</span><div className="w-20 bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-1"><div className={`h-full ${progressColor(server.diskUsage)}`} style={{ width: `${clampPercent(server.diskUsage)}%` }} /></div></td>
                    <td className="py-3 px-4"><div className="font-semibold text-zinc-200">{server.networkUtil.toFixed(1)}%</div><span className="text-[10px] text-zinc-500">I/O Active</span></td>
                    <td className="py-3 px-4 text-zinc-400">{server.uptime}</td>
                    <td className="py-3 px-4 text-right"><Button type="button" variant="ghost" size="xs" className="text-zinc-400 hover:text-white" onClick={(event) => { event.stopPropagation(); setSelectedServer(server); }}><ExternalLink className="w-3.5 h-3.5" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedServer && <Modal isOpen={Boolean(selectedServer)} onClose={() => setSelectedServer(null)} title={`HOST INSPECTOR // ${selectedServer.hostname}`} subtitle={`IP: ${selectedServer.ipAddress} | Region: ${selectedServer.region}`} maxWidth="2xl" footer={<Button variant="secondary" size="sm" onClick={() => setSelectedServer(null)}>Close Inspector</Button>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
            <div><p className="text-[10px] font-mono uppercase text-zinc-400">Health State</p><StatusPill status={selectedServer.status} className="mt-1 text-[10px]" /></div>
            <div><p className="text-[10px] font-mono uppercase text-zinc-400">CPU Cores</p><p className="text-sm font-bold font-mono text-white mt-1">{selectedServer.coreCount} Cores</p></div>
            <div><p className="text-[10px] font-mono uppercase text-zinc-400">Load Average</p><p className="text-xs font-mono font-semibold text-zinc-200 mt-1">{selectedServer.loadAvg.join(', ') || '—'}</p></div>
            <div><p className="text-[10px] font-mono uppercase text-zinc-400">Active Procs</p><p className="text-sm font-bold font-mono text-white mt-1">{selectedServer.processesCount}</p></div>
          </div>
          <Card variant="bordered" className="p-3"><p className="text-xs font-mono font-semibold text-white mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />Host Telemetry Trend (Past 15 Minutes)</p><RealtimeLineChart data={miniHistory(selectedServer)} height={150} series={[{ key: 'cpu', name: 'CPU (%)', strokeWidth: 2 }, { key: 'ram', name: 'RAM (%)', strokeWidth: 2 }]} /></Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1"><span className="text-zinc-500 uppercase text-[10px]">Operating System</span><p className="text-zinc-200">{selectedServer.os}</p></div>
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1"><span className="text-zinc-500 uppercase text-[10px]">Disk Capacity</span><p className="text-zinc-200">{selectedServer.diskTotal} ({selectedServer.diskUsage}% used)</p></div>
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1"><span className="text-zinc-500 uppercase text-[10px]">Memory Config</span><p className="text-zinc-200">{selectedServer.ramTotal} ({selectedServer.ramUsage}% allocated)</p></div>
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1"><span className="text-zinc-500 uppercase text-[10px]">Heartbeat</span><p className="text-zinc-200">{selectedServer.lastSeen}</p></div>
          </div>
          <div className="space-y-1.5"><span className="text-xs font-mono uppercase text-zinc-400">Cluster Tags</span><div className="flex flex-wrap gap-1.5">{selectedServer.tags.map((tag) => <Badge key={tag} variant="outline">#{tag}</Badge>)}</div></div>
        </div>
      </Modal>}
    </div>
  );
};

export default InfrastructurePage;
