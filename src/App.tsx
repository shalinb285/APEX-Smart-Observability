
import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { MonitoringProvider } from './context/MonitoringContext';
import { AppLayout } from './components/layout/AppLayout';

import LoginPage from './pages/LoginPage';

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

import { EgressProofPage } from './pages/EgressProofPage';
import { IntegrityLockPage } from './pages/IntegrityLockPage';
import { TenantManagementPage } from './pages/TenantManagementPage';
import { StreamSimulatorPage } from './pages/StreamSimulatorPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#07090d',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'monospace'
      }}>
        INITIALIZING APEX SESSION...
      </div>
    );
  }

  return isAuthenticated
    ? <>{children}</>
    : <Navigate to="/login" replace />;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isLoading
            ? <div>Initializing APEX session...</div>
            : isAuthenticated
              ? <Navigate to="/" replace />
              : <LoginPage />
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
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

        <Route path="egress-proof" element={<EgressProofPage />} />
        <Route path="integrity-lock" element={<IntegrityLockPage />} />
        <Route path="tenants" element={<TenantManagementPage />} />
        <Route path="stream-simulator" element={<StreamSimulatorPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MonitoringProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </MonitoringProvider>
    </AuthProvider>
  );
};

export default App;
