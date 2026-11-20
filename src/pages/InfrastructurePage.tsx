import React, { useState, useEffect } from 'react';
import {
  Server,
  Cpu,
  Activity,
  HardDrive,
  Wifi,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowUpDown,
  ExternalLink,
  Shield,
  Layers,
  Terminal,
} from 'lucide-react';
import { ServerInfo } from '../types';
import { api } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusPill } from '../components/ui/StatusPill';
import { SearchInput } from '../components/ui/SearchInput';
import { Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { RealtimeLineChart } from '../components/charts/RealtimeLineChart';

export const InfrastructurePage: React.FC = () => {
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null);

  useEffect(() => {
    const fetchServers = async () => {
      setLoading(true);
      try {
        const data = await api.getServers();
        setServers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchServers();
  }, []);

  const filteredServers = servers.filter((s) => {
    const matchesSearch =
      s.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.ipAddress.includes(searchTerm) ||
      s.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesRegion = regionFilter === 'all' || s.region.toLowerCase().includes(regionFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesRegion;
  });

  const getMetricColor = (val: number) => {
    if (val >= 90) return 'text-white font-bold';
    if (val >= 75) return 'text-zinc-200';
    return 'text-zinc-400';
  };

  const getProgressBarColor = (val: number) => {
    if (val >= 90) return 'bg-white';
    if (val >= 75) return 'bg-zinc-400';
    return 'bg-zinc-600';
  };

  // Generate synthetic mini host history for detail modal
  const generateHostMiniHistory = (server: ServerInfo) => {
    const points = [];
    const now = Date.now();
    for (let i = 12; i >= 0; i--) {
      const time = new Date(now - i * 60 * 1000);
      points.push({
        timestamp: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cpu: Math.min(100, Math.max(10, server.cpuUsage + (Math.sin(i) * 6))),
        ram: Math.min(100, Math.max(10, server.ramUsage + (Math.cos(i) * 3))),
      });
    }
    return points;
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
            placeholder="Search host, IP, or tag..."
            className="w-full sm:w-72"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800 text-xs font-mono">
            {(['all', 'healthy', 'warning', 'critical'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                  statusFilter === st ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Region filter dropdown */}
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="bg-black border border-zinc-800 text-xs font-mono text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Regions</option>
            <option value="us-east-1">us-east-1</option>
            <option value="us-west-2">us-west-2</option>
            <option value="eu-central-1">eu-central-1</option>
          </select>
        </div>
      </div>

      {/* Infrastructure Server Fleet Table */}
      <Card noPadding className="overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-zinc-300" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
              Host Fleet Inventory ({filteredServers.length} Nodes)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Click any row for deep diagnostics
          </span>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={6} />
          </div>
        ) : filteredServers.length === 0 ? (
          <EmptyState
            title="No Hosts Found"
            description="No servers matched your current filter or query."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setRegionFilter('all');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Host &amp; IP</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Region</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">CPU</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">RAM</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Disk</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Net Util</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Uptime</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredServers.map((server) => (
                  <tr
                    key={server.id}
                    onClick={() => setSelectedServer(server)}
                    className="hover:bg-zinc-900/60 transition-colors cursor-pointer group"
                  >
                    {/* Host & IP */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-white transition-colors">
                          <Server className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-white transition-colors">
                            {server.hostname}
                          </div>
                          <div className="text-[11px] text-zinc-400">{server.ipAddress}</div>
                        </div>
                      </div>
                    </td>

                    {/* Region */}
                    <td className="py-3 px-4 text-zinc-300">
                      <div>{server.region.split(' ')[0]}</div>
                      <div className="text-[10px] text-zinc-500">{server.region.split(' ')[1] || ''}</div>
                    </td>

                    {/* Health Status */}
                    <td className="py-3 px-4">
                      <StatusPill status={server.status} className="text-[10px]" />
                    </td>

                    {/* CPU Usage */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${getMetricColor(server.cpuUsage)}`}>
                          {server.cpuUsage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-20 bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full ${getProgressBarColor(server.cpuUsage)}`}
                          style={{ width: `${server.cpuUsage}%` }}
                        />
                      </div>
                    </td>

                    {/* RAM Usage */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${getMetricColor(server.ramUsage)}`}>
                          {server.ramUsage.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-zinc-500">({server.ramTotal})</span>
                      </div>
                      <div className="w-20 bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full ${getProgressBarColor(server.ramUsage)}`}
                          style={{ width: `${server.ramUsage}%` }}
                        />
                      </div>
                    </td>

                    {/* Disk Usage */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200">{server.diskUsage.toFixed(1)}%</span>
                        <span className="text-[10px] text-zinc-500">({server.diskTotal})</span>
                      </div>
                      <div className="w-20 bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full ${getProgressBarColor(server.diskUsage)}`}
                          style={{ width: `${server.diskUsage}%` }}
                        />
                      </div>
                    </td>

                    {/* Network Util */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-200">{server.networkUtil.toFixed(1)}%</div>
                      <span className="text-[10px] text-zinc-500">I/O Active</span>
                    </td>

                    {/* Uptime */}
                    <td className="py-3 px-4 text-zinc-400">{server.uptime}</td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="xs" className="text-zinc-400 hover:text-white">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detailed Server Modal */}
      {selectedServer && (
        <Modal
          isOpen={!!selectedServer}
          onClose={() => setSelectedServer(null)}
          title={`HOST INSPECTOR // ${selectedServer.hostname}`}
          subtitle={`IP: ${selectedServer.ipAddress} | Region: ${selectedServer.region}`}
          maxWidth="2xl"
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setSelectedServer(null)}>
                Close Inspector
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  alert(`Executing diagnostic restart routine on ${selectedServer.hostname}...`);
                  setSelectedServer(null);
                }}
              >
                Restart Host Daemon
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Status & Specs Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <div>
                <p className="text-[10px] font-mono uppercase text-zinc-400">Health State</p>
                <StatusPill status={selectedServer.status} className="mt-1 text-[10px]" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-zinc-400">CPU Cores</p>
                <p className="text-sm font-bold font-mono text-white mt-1">{selectedServer.coreCount} Cores</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-zinc-400">Load Average</p>
                <p className="text-xs font-mono font-semibold text-zinc-200 mt-1">
                  {selectedServer.loadAvg.join(', ')}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-zinc-400">Active Procs</p>
                <p className="text-sm font-bold font-mono text-white mt-1">
                  {selectedServer.processesCount}
                </p>
              </div>
            </div>

            {/* Micro time-series chart */}
            <Card variant="bordered" className="p-3">
              <p className="text-xs font-mono font-semibold text-white mb-2 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Host Telemetry Trend (Past 15 Minutes)
              </p>
              <RealtimeLineChart
                data={generateHostMiniHistory(selectedServer)}
                height={150}
                series={[
                  { key: 'cpu', name: 'CPU (%)', strokeWidth: 2 },
                  { key: 'ram', name: 'RAM (%)', strokeWidth: 2 },
                ]}
              />
            </Card>

            {/* System Details List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-500 uppercase text-[10px]">Operating System</span>
                <p className="text-zinc-200">{selectedServer.os}</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-500 uppercase text-[10px]">Disk Capacity</span>
                <p className="text-zinc-200">
                  {selectedServer.diskTotal} ({selectedServer.diskUsage}% used)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-500 uppercase text-[10px]">Memory Config</span>
                <p className="text-zinc-200">
                  {selectedServer.ramTotal} ECC ({selectedServer.ramUsage}% allocated)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-500 uppercase text-[10px]">Heartbeat</span>
                <p className="text-zinc-200">{selectedServer.lastSeen}</p>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono uppercase text-zinc-400">Cluster Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedServer.tags.map((t) => (
                  <Badge key={t} variant="outline">
                    #{t}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
