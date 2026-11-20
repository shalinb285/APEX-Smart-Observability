import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { MonitoringProvider } from './context/MonitoringContext';
import { AppLayout } from './components/layout/AppLayout';

import { OverviewPage } from './pages/OverviewPage';
import { InfrastructurePage } from './pages/InfrastructurePage';
import { APMPage } from './pages/APMPage';
import { LogsPage } from './pages/LogsPage';
import { TracingPage } from './pages/TracingPage';
import { AIIntelligencePage } from './pages/AIIntelligencePage';
import { AlertsPage } from './pages/AlertsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { RemediationPage } from './pages/RemediationPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

// Tier-2 SaaS & Privacy Evaluation Pages
import { EgressProofPage } from './pages/EgressProofPage';
import { IntegrityLockPage } from './pages/IntegrityLockPage';
import { TenantManagementPage } from './pages/TenantManagementPage';
import { StreamSimulatorPage } from './pages/StreamSimulatorPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MonitoringProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="overview" element={<Navigate to="/" replace />} />
              <Route path="infrastructure" element={<InfrastructurePage />} />
              <Route path="apm" element={<APMPage />} />
              <Route path="logs" element={<LogsPage />} />
              <Route path="tracing" element={<TracingPage />} />
              <Route path="ai-intelligence" element={<AIIntelligencePage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="incidents" element={<IncidentsPage />} />
              <Route path="remediation" element={<RemediationPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />

              {/* Tier-2 Privacy & SaaS Evaluation Routes */}
              <Route path="egress-proof" element={<EgressProofPage />} />
              <Route path="integrity-lock" element={<IntegrityLockPage />} />
              <Route path="tenants" element={<TenantManagementPage />} />
              <Route path="stream-simulator" element={<StreamSimulatorPage />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </MonitoringProvider>
    </AuthProvider>
  );
};

export default App;
