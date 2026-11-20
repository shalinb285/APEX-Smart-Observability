import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Menu,
  Play,
  Pause,
  Database,
  Globe,
  Bell,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Lock,
  Building2,
  Activity,
} from 'lucide-react';
import { useMonitoring } from '../../context/MonitoringContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { healthScoring } from '../../services/healthScoring';
import { TestRunnerModal } from '../saas/TestRunnerModal';

interface HeaderProps {
  onMobileOpen: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMobileOpen }) => {
  const location = useLocation();
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const {
    overview,
    latestMetric,
    isLiveStreaming,
    streamMode,
    mockMode,
    toggleLiveStream,
    toggleMockMode,
    refreshOverview,
    activeAlertsCount,
  } = useMonitoring();

  // Evaluate current product health state
  const healthResult = healthScoring.evaluateHealth({
    cpu: latestMetric ? latestMetric.cpu : overview?.cpuUtilization,
    memory: latestMetric ? latestMetric.memory : overview?.memoryUtilization,
    disk: overview?.diskUtilization,
    latency: latestMetric?.responseTime || overview?.responseTimeMs,
    timestamp: overview?.timestamp ?? latestMetric?.timestamp,
  });

  // Route title formatting
  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/':
      case '/overview':
        return 'System Overview Dashboard';
      case '/infrastructure':
        return 'Infrastructure & Host Fleet';
      case '/apm':
        return 'Application Performance Monitoring';
      case '/logs':
        return 'Centralized Log Explorer';
      case '/tracing':
        return 'Distributed Tracing & Topology';
      case '/ai-intelligence':
        return 'AI Intelligence Center';
      case '/alerts':
        return 'Alert Management & Thresholds';
      case '/incidents':
        return 'Incident Response & RCA';
      case '/remediation':
        return 'Automated Remediation Engine';
      case '/reports':
        return 'SLA Reports & Historical Analytics';
      case '/settings':
        return 'Platform Settings & Integrations';
      case '/egress-proof':
        return 'Tier-1 Egress Proof & Privacy Audit';
      case '/integrity-lock':
        return 'Telemetry Integrity Lock & Replay Defense';
      case '/tenants':
        return 'Multi-Tenant Isolation & Key Vaults';
      case '/stream-simulator':
        return 'Organizer Stream Adapter & 10 Scenarios';
      default:
        return 'Smart Observability Platform';
    }
  };

  const healthBadgeColors = {
    EXCELLENT: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
    GOOD: 'bg-blue-950/40 text-blue-400 border-blue-800/40',
    FAIR: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
    POOR: 'bg-rose-950/40 text-rose-400 border-rose-800/40',
  };

  const freshnessBadgeColors = {
    FRESH: 'text-emerald-400',
    STALE: 'text-amber-400',
    OFFLINE: 'text-rose-400',
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-6 bg-black/95 backdrop-blur-md border-b border-zinc-800">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileOpen}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-zinc-500 tracking-wider hidden sm:inline">
                APEX //
              </span>
              <h1 className="text-sm font-semibold font-mono text-white tracking-tight">
                {getPageTitle(location.pathname)}
              </h1>
            </div>
          </div>
        </div>

        {/* Middle: Live Telemetry Micro-Ticker & Product Health State */}
        <div className="hidden xl:flex items-center gap-4 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono">
          {/* 4-State Product Health Indicator */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-zinc-850">
            <span className="text-[10px] text-zinc-500 uppercase">HEALTH:</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${healthBadgeColors[healthResult.state]}`}
              title={healthResult.reason}
            >
              {healthResult.state}
            </span>
            <span className={`text-[10px] font-semibold ${freshnessBadgeColors[healthResult.freshness]}`}>
              ● {healthResult.freshness}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">CPU:</span>
            <span className="font-semibold text-white">
              {latestMetric ? `${latestMetric.cpu.toFixed(1)}%` : `${overview?.cpuUtilization || '--'}%`}
            </span>
          </div>
          <div className="w-[1px] h-3 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">MEM:</span>
            <span className="font-semibold text-white">
              {latestMetric ? `${latestMetric.memory.toFixed(1)}%` : `${overview?.memoryUtilization || '--'}%`}
            </span>
          </div>
          <div className="w-[1px] h-3 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">LATENCY:</span>
            <span className="font-semibold text-white">
              {latestMetric?.responseTime ? `${latestMetric.responseTime}ms` : `${overview?.responseTimeMs || '--'}ms`}
            </span>
          </div>
        </div>

        {/* Right: Actions, Mode Toggles, User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 12 Automated Verification Tests Button */}
          <Button
            variant="outline"
            size="xs"
            onClick={() => setIsTestModalOpen(true)}
            title="Run 12 Automated Compliance & Security Tests"
            className="font-mono text-xs hidden md:inline-flex border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/20"
            icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
          >
            VERIFY TESTS (12/12)
          </Button>

          {/* Live Stream Toggle Button */}
          <Button
            variant={isLiveStreaming ? 'secondary' : 'outline'}
            size="xs"
            onClick={toggleLiveStream}
            title={isLiveStreaming ? 'Pause live metric updates' : 'Resume live stream'}
            className="font-mono text-xs hidden sm:inline-flex"
            icon={isLiveStreaming ? <Pause className="w-3.5 h-3.5 text-zinc-400" /> : <Play className="w-3.5 h-3.5 text-white" />}
          >
            {isLiveStreaming ? 'STREAMING' : 'PAUSED'}
          </Button>

          {/* Mock Mode Indicator / Toggle */}
          <button
            onClick={() => toggleMockMode()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Click to toggle between Mock Mode and Live Backend"
          >
            <Database className="w-3.5 h-3.5 text-white" />
            <span className="hidden md:inline">DATA:</span>
            <span className={mockMode ? 'text-zinc-300 font-semibold' : 'text-white font-bold'}>
              {mockMode ? 'MOCK' : 'LIVE'}
            </span>
          </button>

          {/* Refresh button */}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => refreshOverview()}
            title="Refresh dashboard data"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>

          {/* Alerts quick icon */}
          <div className="relative">
            <Link to="/alerts">
              <Button variant="ghost" size="xs" className="p-1.5 rounded-lg text-zinc-400 hover:text-white">
                <Bell className="w-4 h-4" />
              </Button>
              {activeAlertsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white ring-2 ring-black" />
              )}
            </Link>
          </div>

          {/* User profile avatar badge */}
          <Link to="/tenants" title="Tenant: Apex Global Technologies (Enterprise)">
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-white to-zinc-500 p-[1px]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-mono text-xs font-bold text-white">
                  SRE
                </div>
              </div>
            </div>
          </Link>
        </div>
      </header>

      {/* Automated Tests Modal */}
      <TestRunnerModal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} />
    </>
  );
};
