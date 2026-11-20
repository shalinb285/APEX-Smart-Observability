import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Activity,
  Terminal,
  Network,
  Cpu,
  AlertTriangle,
  Flame,
  Wrench,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Radio,
  EyeOff,
  Fingerprint,
  Building2,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMonitoring } from '../../context/MonitoringContext';

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onMobileClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { activeAlertsCount, activeIncidentsCount, streamMode } = useMonitoring();

  // Preserved original 11 navigation items
  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Infrastructure', path: '/infrastructure', icon: Server },
    { name: 'Application Monitoring', path: '/apm', icon: Activity },
    { name: 'Logs', path: '/logs', icon: Terminal },
    { name: 'Distributed Tracing', path: '/tracing', icon: Network },
    { name: 'AI Intelligence', path: '/ai-intelligence', icon: Cpu, highlight: true },
    { name: 'Alerts', path: '/alerts', icon: AlertTriangle, badge: activeAlertsCount, badgeColor: 'bg-white text-black font-bold' },
    { name: 'Incidents', path: '/incidents', icon: Flame, badge: activeIncidentsCount, badgeColor: 'bg-zinc-800 text-white border border-zinc-700' },
    { name: 'Remediation', path: '/remediation', icon: Wrench },
    { name: 'Reports', path: '/reports', icon: FileBarChart },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Tier-2 SaaS & Privacy Evaluation Additions
  const saasNavItems = [
    { name: 'Egress Proof', path: '/egress-proof', icon: EyeOff, badge: 'EVAL', badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
    { name: 'Integrity Lock', path: '/integrity-lock', icon: Fingerprint },
    { name: 'Tenants & RBAC', path: '/tenants', icon: Building2 },
    { name: 'Stream Simulator', path: '/stream-simulator', icon: Zap },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-[#050505] border-r border-zinc-800 transition-all duration-300 select-none',
          isCollapsed ? 'w-20' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo / Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-800 bg-black">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white to-zinc-400 p-[1px] shadow-sm flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-[11px] bg-black flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-sm font-bold tracking-widest font-mono text-white uppercase">
                  APEX
                </span>
                <span className="text-[10px] tracking-wider font-mono text-zinc-400">
                  SMART OBSERVABILITY
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          <div className={cn('px-2 mb-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400', isCollapsed && 'text-center')}>
            {!isCollapsed ? 'Telemetry & Ops' : '•••'}
          </div>

          {/* Original 11 Observability Items */}
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono font-medium transition-all duration-150',
                    isActive
                      ? 'bg-zinc-900 text-white border border-zinc-700 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60',
                    isCollapsed && 'justify-center px-2'
                  )
                }
              >
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 text-zinc-300 group-hover:text-white'
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}

                {/* Badge */}
                {!isCollapsed && item.badge !== undefined && typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={cn(
                      'ml-auto px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border border-transparent',
                      item.badgeColor || 'bg-zinc-800 text-zinc-300'
                    )}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Collapsed Badge Dot */}
                {isCollapsed && item.badge !== undefined && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </NavLink>
            );
          })}

          {/* Privacy & Tier-2 Section */}
          <div className={cn('px-2 pt-4 pb-1 mb-1 text-[10px] font-mono uppercase tracking-wider text-emerald-400/80 border-t border-zinc-850', isCollapsed && 'text-center')}>
            {!isCollapsed ? 'Privacy & Tier-2 SaaS' : '•••'}
          </div>

          {saasNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-mono font-medium transition-all duration-150',
                    isActive
                      ? 'bg-zinc-900 text-white border border-emerald-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60',
                    isCollapsed && 'justify-center px-2'
                  )
                }
              >
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 text-emerald-400'
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}

                {!isCollapsed && item.badge && (
                  <span
                    className={cn(
                      'ml-auto px-1.5 py-0.5 rounded text-[9px] font-mono font-bold',
                      item.badgeColor || 'bg-zinc-800 text-zinc-300'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer Status Pill */}
        <div className="p-3 border-t border-zinc-800 bg-black">
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                <div className="flex flex-col">
                  <span className="text-[11px] font-mono font-semibold text-zinc-200">
                    E2EE ACTIVE
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400 uppercase">
                    {streamMode === 'live_ws' ? 'Live WebSocket' : 'Simulated Stream'}
                  </span>
                </div>
              </div>
              <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
            </div>
          ) : (
            <div className="flex justify-center py-1" title="Engine Active">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
