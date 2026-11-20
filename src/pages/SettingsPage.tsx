import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Bell,
  Sliders,
  Database,
  Globe,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Key,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusPill } from '../components/ui/StatusPill';
import { useMonitoring } from '../context/MonitoringContext';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { mockMode, toggleMockMode, tickInterval, setTickInterval, showNotification } = useMonitoring();

  // Settings State
  const [backendUrl, setBackendUrl] = useState(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');
  const [wsUrl, setWsUrl] = useState(import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/telemetry');
  const [sampleRate, setSampleRate] = useState<number>(tickInterval);
  const [anomalySensitivity, setAnomalySensitivity] = useState<'high' | 'medium' | 'low'>('high');
  const [pingStatus, setPingStatus] = useState<{ testing: boolean; result?: string; success?: boolean } | null>(null);

  // Profile State
  const [profile, setProfile] = useState({
    name: 'Alex Vance',
    email: 'alex.vance@enterprise-secops.internal',
    role: 'Principal SRE & Platform Architect',
    team: 'Core Infrastructure & Reliability',
  });

  // Notification Preferences State
  const [notifications, setNotifications] = useState({
    pagerDuty: true,
    slackWebhook: true,
    emailDigest: false,
    p1SmsAlerts: true,
  });

  const handleTestConnection = async () => {
    setPingStatus({ testing: true });
    try {
      const res = await api.checkBackendConnection();
      if (res.online) {
        setPingStatus({ testing: false, success: true, result: `Connected! Roundtrip: ${res.latencyMs}ms` });
        showNotification(`Backend connected successfully (${res.latencyMs}ms)`, 'success');
      } else {
        setPingStatus({
          testing: false,
          success: false,
          result: `Unreachable: ${res.error || 'Connection refused at ' + backendUrl}. (Mock mode available)`,
        });
        showNotification('Backend unreachable. Mock Mode fallback is active.', 'warning');
      }
    } catch (e: any) {
      setPingStatus({ testing: false, success: false, result: e.message || 'Connection failed' });
    }
  };

  const handleSaveAll = () => {
    setTickInterval(sampleRate);
    showNotification('APEX platform configurations saved', 'success');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-mono tracking-tight text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-white" />
            PLATFORM SETTINGS &amp; INTEGRATIONS
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure backend connection endpoints, data simulation modes, and alert webhooks
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSaveAll}
          icon={<Save className="w-4 h-4" />}
          className="text-xs font-mono"
        >
          SAVE PREFERENCES
        </Button>
      </div>

      {/* Section 1: Backend Connection & Mock Mode Switch */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <Globe className="w-4 h-4 text-white" />
              Backend Connection &amp; Data Source Configuration
            </CardTitle>
            <CardDescription>
              Toggle between realistic offline Mock Mode and external REST/WebSocket backend
            </CardDescription>
          </div>
          <Badge variant={mockMode ? 'warning' : 'healthy'}>
            MODE: {mockMode ? 'LOCAL MOCK' : 'LIVE BACKEND'}
          </Badge>
        </CardHeader>

        <div className="space-y-4 font-mono text-xs">
          {/* Mock Mode Toggle Switch */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-black border border-zinc-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-white" />
                <span className="font-bold text-white text-sm">Standalone Mock Mode</span>
              </div>
              <p className="text-zinc-400 text-xs font-sans max-w-xl">
                When enabled, the platform serves high-fidelity enterprise mock data across all 15 endpoints
                and runs an autonomous WebSocket telemetry simulator. Disable when connecting to a live backend.
              </p>
            </div>

            <button
              onClick={() => toggleMockMode()}
              className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                mockMode ? 'bg-white' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                  mockMode ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-zinc-400 font-semibold uppercase text-[10px]">
                REST API Base URL (VITE_API_BASE_URL)
              </label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-lg text-white font-mono focus:outline-none focus:border-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 font-semibold uppercase text-[10px]">
                WebSocket Endpoint (VITE_WS_URL)
              </label>
              <input
                type="text"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-lg text-white font-mono focus:outline-none focus:border-white"
              />
            </div>
          </div>

          {/* Test Ping */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestConnection}
              isLoading={pingStatus?.testing}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              TEST BACKEND HEALTH PING
            </Button>

            {pingStatus && !pingStatus.testing && (
              <span
                className={`text-xs font-semibold ${
                  pingStatus.success ? 'text-white' : 'text-zinc-400'
                }`}
              >
                {pingStatus.result}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Section 2: Monitoring & Telemetry Configuration */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <Sliders className="w-4 h-4 text-white" />
              Telemetry Sampling &amp; Anomaly Detection Thresholds
            </CardTitle>
            <CardDescription>
              Fine-tune polling frequencies and machine learning anomaly sensitivity
            </CardDescription>
          </div>
        </CardHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          {/* Polling Interval */}
          <div className="space-y-2 p-3.5 rounded-lg bg-black border border-zinc-800">
            <label className="text-zinc-300 font-semibold block">Telemetry Tick Interval</label>
            <div className="flex items-center gap-2">
              {[1000, 3000, 5000].map((ms) => (
                <button
                  key={ms}
                  onClick={() => setSampleRate(ms)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                    sampleRate === ms ? 'bg-zinc-800 text-white font-bold border border-zinc-600' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {ms / 1000}s ({ms === 1000 ? 'High Frequency' : ms === 3000 ? 'Default' : 'Conservative'})
                </button>
              ))}
            </div>
          </div>

          {/* Anomaly ML Model Sensitivity */}
          <div className="space-y-2 p-3.5 rounded-lg bg-black border border-zinc-800">
            <label className="text-zinc-300 font-semibold block">AI Anomaly Sensitivity</label>
            <div className="flex items-center gap-2">
              {(['high', 'medium', 'low'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setAnomalySensitivity(lvl)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono capitalize transition-colors ${
                    anomalySensitivity === lvl ? 'bg-zinc-800 text-white font-bold border border-zinc-600' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Section 3: User Profile & Security Tokens */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <User className="w-4 h-4 text-white" />
              Operator Profile &amp; RBAC Clearance
            </CardTitle>
            <CardDescription>Authenticated user identity and role assignment</CardDescription>
          </div>
          <Badge variant="outline">ADMIN // SRE</Badge>
        </CardHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          <div className="space-y-1.5">
            <label className="text-zinc-400 font-semibold uppercase text-[10px]">Operator Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-lg text-white font-mono focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-400 font-semibold uppercase text-[10px]">Email Address</label>
            <input
              type="text"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-lg text-white font-mono focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-400 font-semibold uppercase text-[10px]">Role / Clearance</label>
            <input
              type="text"
              value={profile.role}
              disabled
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-400 font-semibold uppercase text-[10px]">Assigned Cluster Team</label>
            <input
              type="text"
              value={profile.team}
              disabled
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 font-mono"
            />
          </div>
        </div>
      </Card>

      {/* Section 4: Alert Notification Routing */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <Bell className="w-4 h-4 text-white" />
              Alert Notification Channels &amp; Webhooks
            </CardTitle>
            <CardDescription>Manage real-time paging and incident escalation routes</CardDescription>
          </div>
        </CardHeader>

        <div className="divide-y divide-zinc-800/80 font-mono text-xs">
          {[
            { key: 'pagerDuty', label: 'PagerDuty High-Urgency Escalation', desc: 'Trigger on-call dispatch for P1 & Critical incidents' },
            { key: 'slackWebhook', label: 'Slack #secops-alerts Webhook', desc: 'Broadcast all warning and anomaly events to triage channel' },
            { key: 'p1SmsAlerts', label: 'Direct SMS Fallback', desc: 'Send emergency SMS when network latency exceeds SLA bounds' },
            { key: 'emailDigest', label: 'Daily Executive SLA Digest', desc: 'Deliver daily 08:00 UTC uptime and incident rollup email' },
          ].map((item) => (
            <div key={item.key} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-white">{item.label}</p>
                <p className="text-[11px] text-zinc-400 font-sans">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={(notifications as any)[item.key]}
                onChange={(e) =>
                  setNotifications({ ...notifications, [item.key]: e.target.checked })
                }
                className="w-4 h-4 rounded bg-black border-zinc-700 text-white focus:ring-0 cursor-pointer"
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
