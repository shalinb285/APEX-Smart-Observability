# APEX // AI-Powered Smart Observability Platform
## Privacy-First Multi-Tenant SaaS & Observability Integration | CICADA 2K26 (Tier-2)

An enterprise-grade, high-performance monitoring and observability web application inspired by Datadog, Grafana, and New Relic. Built with React 18, TypeScript, Tailwind CSS, Lucide Icons, and Recharts, styled strictly in a high-contrast black-and-white minimalist theme with comprehensive Tier-2 Privacy and End-to-End Encryption (E2EE).

---

## 1. Key Features

- **Dark Theme Engineering**: Professional dark navy/charcoal background (`#090B10`), sleek metallic borders, and precise telemetry accent highlights.
- **Strict Frontend Preservation**:
  - All 11 original monitoring pages, charts, layouts, black-and-white theme, and WebSocket implementations remain 100% intact.
  - New SaaS functionality integrates purely additively through dedicated route extensions, transparent decryption adapters, and modular contexts.
- **11 Dedicated Operational Dashboards (Preserved)**:
  1. **Overview Dashboard**: Centralized system health percentage, active incidents, critical alerts, real-time resource utilization line charts, donut distribution, and AI health summaries.
  2. **Infrastructure Monitoring**: Monitored host fleet, IP, CPU, RAM, Disk, Net I/O, server uptime, health status, and deep inspector modal.
  3. **Application Performance Monitoring (APM)**: Response times, RPS velocity, error rates, throughput, API endpoint percentiles (P95, P99), and slow transaction profiler with time filters (`15m`, `1h`, `6h`, `24h`, `7d`).
  4. **Log Analysis**: Full-text log search, filtering by service and severity (`INFO`, `WARNING`, `ERROR`, `CRITICAL`), error highlighting, and expandable JSON context/stack-trace viewer.
  5. **Distributed Tracing**: Visual service topology graph (SVG mesh), request flows, trace IDs, latency waterfalls, and individual span inspect dialogs.
  6. **AI Intelligence Center**: Anomaly Detection, Predictive Forecasting, Root Cause Analysis (RCA), and AI Remediation Recommendations.
  7. **Alert Management**: Active, critical, warning, and resolved alerts with instant acknowledge and resolve actions.
  8. **Incident Management**: War room commander with incident lifecycle stages (`investigating`, `identified`, `monitoring`, `resolved`), timeline chronology, and investigation notes.
  9. **Automated Remediation**: Safe execution of corrective actions (rollback, pod autoscaling, cache clear, service restart, database drain playbook) with 2-step confirmation modals and execution output logs.
  10. **Reports and Analytics**: SLA compliance, MTTR/MTTD metrics, alert frequency histograms, microservice availability tables, and one-click **Export to CSV**.
  11. **Platform Settings**: Backend API URL configuration, WebSocket endpoint setup, mock data toggle, sampling intervals, operator RBAC, and notification routing.

- **Tier-2 Privacy & SaaS Evaluation Dashboards (Additive)**:
  12. **Egress Proof Panel (`/egress-proof`)**: Demonstrates precisely what leaves the trusted local collector (16 mandatory verification points, interactive secret injection simulation, and audit export).
  13. **Telemetry Integrity Lock (`/integrity-lock`)**: Cryptographic Ed25519 identity, monotonic sequence tracking, replay attack defense, signature tamper detection, and device revocation.
  14. **Tenant Management & RBAC (`/tenants`)**: Multi-tenant separation proof (Tenant A vs. Tenant B), client-side in-memory WebCrypto Key Vault (HPKE P-256), and role-based permissions matrix.
  15. **Organizer Stream Adapter & Simulator (`/stream-simulator`)**: Real-time 5-hop Telemetry Latency Clock, 10 reproducible scenarios, and Zero-Loss & Zero-Duplicate reconciliation ledger.

- **4-State Product Health & Freshness Engine**:
  - Product Health States: `EXCELLENT`, `GOOD`, `FAIR`, `POOR` with transparent triggering metrics and thresholds.
  - Operational Freshness: `FRESH` (&lt;10s), `STALE` (10s–60s), `OFFLINE` (&gt;60s trigger).

- **Automated Verification Test Suite (12/12 Tests)**:
  - Accessible via the **"VERIFY TESTS (12/12)"** button in the header or via `npm test` in the terminal.

---

## 2. Technology Stack

- **Framework**: React 18 with Vite
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Visualizations & Charts**: Recharts
- **Icons**: Lucide React
- **Cryptography**: WebCrypto API (ECDH NIST P-256, AES-256-GCM, HKDF, SHA-256)
- **HTTP Client**: Axios (centralized in `src/services/api.ts`)
- **Navigation**: React Router DOM v6

---

## 3. Project Structure

```
c:\Users\Shalin\Downloads\APEX MODEL\
├── .env                              # Environment configuration
├── .env.example                      # Sample environment variables
├── package.json                      # Dependencies and npm scripts
├── vite.config.ts                    # Vite build configuration with alias '@'
├── tailwind.config.js                # Custom enterprise dark theme tokens
├── tsconfig.json                     # TypeScript compiler options
├── README.md                         # Documentation
├── docs/
│   ├── ARCHITECTURE_AND_E2EE.md      # System architecture, privacy data flow, and E2EE spec
│   ├── INTEGRATION_CONTRACTS.md      # Shared contract between Collector, SaaS, and Frontend
│   └── HACKATHON_DEMO_SCRIPT_AND_QA.md# 4-Phase presentation script and judge Q&A guide
├── src/
│   ├── main.tsx                      # Application entrypoint
│   ├── App.tsx                       # Router configuration & root provider
│   ├── index.css                     # Global styles and custom scrollbar
│   ├── types/
│   │   ├── index.ts                  # Observability telemetry entities
│   │   ├── saas.ts                   # Tenant, RBAC, and crypto envelope types
│   │   └── privacy.ts                # Privacy pipeline, allowlist, and audit record types
│   ├── lib/
│   │   └── utils.ts                  # Styling utilities and formatting helpers
│   ├── services/
│   │   ├── api.ts                    # Centralized Axios client & 15 API endpoints
│   │   ├── saasApi.ts                # Multi-tenant and RBAC API client
│   │   ├── privacyPipeline.ts        # 8-step privacy pipeline & secret scrubbing
│   │   ├── healthScoring.ts          # 4 Product Health states & Freshness classifier
│   │   ├── aiopsEngine.ts            # Contextual multi-signal anomaly correlation
│   │   ├── organizerStreamAdapter.ts # Organizer stream adapter & 10 scenario injector
│   │   ├── decryptionAdapter.ts      # Transparent local decryption layer
│   │   ├── websocket.ts              # WebSocket subscriber & simulated telemetry stream
│   │   ├── mockData.ts               # Realistic enterprise mock datasets
│   │   └── crypto/
│   │       ├── keyManager.ts         # In-memory tenant key vault (P-256)
│   │       ├── encryption.ts         # HPKE envelope encryption (AES-256-GCM)
│   │       ├── decryption.ts         # Local client decryption engine
│   │       └── integrityLock.ts      # Ed25519 signature & sequence validator
│   ├── context/
│   │   ├── AuthContext.tsx           # Multi-tenant session and in-memory key state
│   │   └── MonitoringContext.tsx     # Global metrics state and stream subscription
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx         # Master layout shell
│   │   │   ├── Sidebar.tsx           # Collapsible 15-route sidebar
│   │   │   └── Header.tsx            # Health pill, test runner trigger, and micro-ticker
│   │   ├── saas/
│   │   │   ├── HealthBanner.tsx      # 4-state product health and freshness banner
│   │   │   └── TestRunnerModal.tsx   # Interactive 12-test browser test runner
│   │   ├── ui/                       # Reusable UI cards, buttons, badges, modals
│   │   └── charts/                   # Reusable Recharts line, area, and donut charts
│   ├── pages/
│   │   ├── OverviewPage.tsx          # System Overview Dashboard (with Health Banner)
│   │   ├── InfrastructurePage.tsx    # Infrastructure Monitoring
│   │   ├── APMPage.tsx               # Application Performance Monitoring
│   │   ├── LogsPage.tsx              # Log Analysis
│   │   ├── TracingPage.tsx           # Distributed Tracing & Topology
│   │   ├── AIIntelligencePage.tsx    # AI Intelligence Center
│   │   ├── AlertsPage.tsx            # Alert Management
│   │   ├── IncidentsPage.tsx         # Incident Management
│   │   ├── RemediationPage.tsx       # Automated Remediation
│   │   ├── ReportsPage.tsx           # Reports and Analytics (CSV Export)
│   │   ├── SettingsPage.tsx          # Settings & API connection
│   │   ├── EgressProofPage.tsx       # Tier-1 Egress Proof Panel (Mandatory Evaluation)
│   │   ├── IntegrityLockPage.tsx     # Telemetry Integrity Lock & Replay Defense
│   │   ├── TenantManagementPage.tsx  # Multi-Tenant Isolation & Key Vaults
│   │   └── StreamSimulatorPage.tsx   # Organizer Stream Adapter & 10 Scenarios
│   └── tests/
│       └── run_tests.mjs             # Standalone 12-test automated test suite
```

---

## 4. Installation and Setup

### Prerequisites
- Node.js version 18 or higher (v20+ recommended)
- npm version 9 or higher

### Steps

1. **Clone or navigate to the project directory**:
   ```bash
   cd "c:\Users\Shalin\Downloads\APEX MODEL"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run Automated Test Suite (12/12 Tests)**:
   ```bash
   npm test
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```

5. **Open in Browser**:
   Open [http://localhost:5173](http://localhost:5173) to access the dashboard.

6. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 5. Evaluation Verification Quick Links

| Evaluation Phase | Relevant Documentation & Live Page |
| :--- | :--- |
| **Phase 1: Problem Understanding & Ideation** | [docs/HACKATHON_DEMO_SCRIPT_AND_QA.md](file:///c:/Users/Shalin/Downloads/APEX%20MODEL/docs/HACKATHON_DEMO_SCRIPT_AND_QA.md) |
| **Phase 2: Architecture & Technical Design** | [docs/ARCHITECTURE_AND_E2EE.md](file:///c:/Users/Shalin/Downloads/APEX%20MODEL/docs/ARCHITECTURE_AND_E2EE.md) |
| **Phase 3: Implementation & Prototype** | Routes: `/egress-proof`, `/integrity-lock`, `/tenants`, `/stream-simulator` |
| **Phase 4: Demo Script & Judge Q&A** | [docs/HACKATHON_DEMO_SCRIPT_AND_QA.md](file:///c:/Users/Shalin/Downloads/APEX%20MODEL/docs/HACKATHON_DEMO_SCRIPT_AND_QA.md) |
