import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useMonitoring } from '../../context/MonitoringContext';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const AppLayout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { notification, clearNotification } = useMonitoring();

  const getNotificationIcon = () => {
    switch (notification?.type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-white shrink-0" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-zinc-300 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-white shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-zinc-300 shrink-0" />;
    }
  };

  const getNotificationBorder = () => {
    return 'border-zinc-700 bg-black/95 text-white shadow-2xl';
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col selection:bg-zinc-800 selection:text-white">
      {/* Sidebar */}
      <Sidebar isMobileOpen={isMobileOpen} onMobileClose={() => setIsMobileOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col transition-all duration-300 lg:pl-64">
        {/* Header */}
        <Header onMobileOpen={() => setIsMobileOpen(true)} />

        {/* Global Floating Toast / Notification */}
        {notification && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200 max-w-md">
            <div
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md text-xs font-mono',
                getNotificationBorder()
              )}
            >
              {getNotificationIcon()}
              <span className="flex-1 leading-snug">{notification.message}</span>
              <button
                onClick={clearNotification}
                className="p-1 rounded hover:bg-zinc-800 text-current transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Page View Outlet */}
        <main className="flex-1 p-4 lg:p-6 space-y-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>

        {/* Sub-footer */}
        <footer className="py-4 px-6 border-t border-zinc-900 text-center text-xs font-mono text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-2 bg-black">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
            <span>APEX OBSERVABILITY ENGINE v2.6.4-ENTERPRISE</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-zinc-400">
            <span>CLUSTER: us-east-prod-k8s</span>
            <span>API: 200 OK (22ms)</span>
            <span>SLA: 99.98%</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
