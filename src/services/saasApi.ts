// APEX Centralized SaaS API Service Layer
// Covers Organization management, Multi-Tenant Workspaces, RBAC,
// Subscription Plans, Invoicing, Device Enrollment, and Audit Trails.

import {
    apiClient,
    getStoredMockMode,
    setAccessToken,
} from './api';
import {
  User,
  UserRole,
  Organization,
  OrgMember,
  OrgInvitation,
  SubscriptionPlan,
  OrganizationSubscription,
  UsageQuota,
  AuditLogEntry,
  DeviceRegistration,
  TenantKeyRecord,
  UserSession,
} from '../types/saas';
import { keyManager } from './crypto/keyManager';
import { integrityLockValidator } from './crypto/integrityLock';
interface BackendAuthTokenResponse {
    access_token: string;
    token_type: string;
}

interface BackendUserResponse {
    id: number;
    username: string;
    email: string;
    full_name?: string | null;
    role: string;
    is_active: boolean;
}

const mapBackendRole = (role: string): UserRole => {
    const roleMap: Record<string, UserRole> = {
        admin: 'Organization Administrator',
        operator: 'Engineer',
        viewer: 'Viewer',
    };

    return roleMap[role.toLowerCase()] ?? 'Viewer';
};

const mapBackendUser = (backendUser: BackendUserResponse): User => ({
    id: String(backendUser.id),
    email: backendUser.email,
    fullName: backendUser.full_name || backendUser.username,
    avatarUrl: '',
    emailVerified: false,
    mfaEnabled: false,
    currentOrgId: 'default',
    roles: {
        default: mapBackendRole(backendUser.role),
    },
    createdAt: '',
});
// Initial Mock SaaS Store
const mockUser: User = {
  id: 'usr-apex-alex-chen',
  email: 'alex.chen@enterprise-apex.internal',
  fullName: 'Alex Chen',
  avatarUrl: '',
  emailVerified: true,
  mfaEnabled: true,
  currentOrgId: 'org-apex-enterprise',
  roles: {
    'org-apex-enterprise': 'Owner',
    'org-apex-staging-lab': 'Organization Administrator',
  },
  createdAt: '2026-08-10T12:00:00Z',
};

const mockOrganizations: Organization[] = [
  {
    id: 'org-apex-enterprise',
    name: 'Apex Global Technologies',
    slug: 'apex-global',
    ownerId: 'usr-apex-alex-chen',
    createdAt: '2026-08-10T12:00:00Z',
    subscriptionPlan: 'Enterprise',
    memberCount: 8,
    maxMembers: 50,
    registeredDevicesCount: 4,
    e2eeEnabled: true,
    workspaces: [
      {
        id: 'ws-prod-us',
        orgId: 'org-apex-enterprise',
        name: 'US-East Production Grid',
        environment: 'production',
        region: 'us-east-1',
        serverCount: 6,
        createdAt: '2026-08-10T14:00:00Z',
      },
      {
        id: 'ws-prod-eu',
        orgId: 'org-apex-enterprise',
        name: 'EU-Central Multi-AZ',
        environment: 'production',
        region: 'eu-central-1',
        serverCount: 2,
        createdAt: '2026-08-15T09:00:00Z',
      },
      {
        id: 'ws-staging',
        orgId: 'org-apex-enterprise',
        name: 'Canary & Staging Mesh',
        environment: 'staging',
        region: 'us-west-2',
        serverCount: 2,
        createdAt: '2026-09-01T11:00:00Z',
      },
    ],
    settings: {
      enforceMfa: true,
      ipAllowlist: ['198.51.100.0/24', '203.0.113.44/32'],
      allowedEmailDomains: ['enterprise-apex.internal', 'apex.io'],
    },
  },
  {
    id: 'org-apex-staging-lab',
    name: 'Apex Sandbox & Experiments',
    slug: 'apex-sandbox',
    ownerId: 'usr-apex-alex-chen',
    createdAt: '2026-09-20T16:00:00Z',
    subscriptionPlan: 'Professional',
    memberCount: 3,
    maxMembers: 10,
    registeredDevicesCount: 2,
    e2eeEnabled: true,
    workspaces: [
      {
        id: 'ws-lab-dev',
        orgId: 'org-apex-staging-lab',
        name: 'Local Dev Clusters',
        environment: 'development',
        region: 'local-hybrid',
        serverCount: 2,
        createdAt: '2026-09-20T16:30:00Z',
      },
    ],
    settings: {
      enforceMfa: false,
      ipAllowlist: [],
      allowedEmailDomains: [],
    },
  },
];

const mockMembers: OrgMember[] = [
  {
    id: 'mem-001',
    orgId: 'org-apex-enterprise',
    userId: 'usr-apex-alex-chen',
    email: 'alex.chen@enterprise-apex.internal',
    fullName: 'Alex Chen',
    role: 'Owner',
    status: 'active',
    invitedAt: '2026-08-10T12:00:00Z',
    joinedAt: '2026-08-10T12:00:00Z',
  },
  {
    id: 'mem-002',
    orgId: 'org-apex-enterprise',
    userId: 'usr-jordan-miller',
    email: 'jordan.miller@enterprise-apex.internal',
    fullName: 'Jordan Miller',
    role: 'Organization Administrator',
    status: 'active',
    invitedAt: '2026-08-12T10:00:00Z',
    joinedAt: '2026-08-12T10:30:00Z',
  },
  {
    id: 'mem-003',
    orgId: 'org-apex-enterprise',
    userId: 'usr-sarah-vance',
    email: 'sarah.vance@enterprise-apex.internal',
    fullName: 'Sarah Vance',
    role: 'Security Administrator',
    status: 'active',
    invitedAt: '2026-08-14T08:00:00Z',
    joinedAt: '2026-08-14T09:15:00Z',
  },
  {
    id: 'mem-004',
    orgId: 'org-apex-enterprise',
    userId: 'usr-priya-patel',
    email: 'priya.patel@enterprise-apex.internal',
    fullName: 'Priya Patel',
    role: 'Engineer',
    status: 'active',
    invitedAt: '2026-08-20T11:00:00Z',
    joinedAt: '2026-08-20T13:45:00Z',
  },
  {
    id: 'mem-005',
    orgId: 'org-apex-enterprise',
    userId: 'usr-marcus-brody',
    email: 'marcus.brody@enterprise-apex.internal',
    fullName: 'Marcus Brody',
    role: 'Billing Administrator',
    status: 'active',
    invitedAt: '2026-09-01T15:00:00Z',
    joinedAt: '2026-09-01T16:20:00Z',
  },
  {
    id: 'mem-006',
    orgId: 'org-apex-enterprise',
    userId: 'usr-auditor-external',
    email: 'audits@compliance-firm.corp',
    fullName: 'SOC2 Audit Team',
    role: 'Viewer',
    status: 'active',
    invitedAt: '2026-11-01T09:00:00Z',
    joinedAt: '2026-11-01T09:30:00Z',
  },
];

const mockPlans: SubscriptionPlan[] = [
  {
    id: 'Starter',
    name: 'Starter Tier',
    description: 'Essential observability for growing dev teams & startups.',
    priceMonthly: 79,
    priceAnnual: 790,
    serverLimit: 10,
    deviceLimit: 15,
    ingestionLimitGbDay: 25,
    retentionDays: 14,
    userLimit: 5,
    e2eeSupported: false,
    features: [
      'Up to 10 monitored servers',
      '14-day telemetry retention',
      'Community Slack support',
      'Basic anomaly alerting',
    ],
  },
  {
    id: 'Professional',
    name: 'Professional Tier',
    description: 'Advanced telemetry, custom retention, and priority alerting.',
    priceMonthly: 249,
    priceAnnual: 2490,
    serverLimit: 30,
    deviceLimit: 50,
    ingestionLimitGbDay: 100,
    retentionDays: 30,
    userLimit: 15,
    e2eeSupported: true,
    features: [
      'Up to 30 monitored servers',
      '30-day telemetry retention',
      'End-to-End Encryption (E2EE)',
      'Telemetry Integrity Lock (Ed25519)',
      'PagerDuty & Slack incident sync',
    ],
  },
  {
    id: 'Business',
    name: 'Business Tier',
    description: 'High-throughput microservice grids with AI RCA diagnostics.',
    priceMonthly: 599,
    priceAnnual: 5990,
    serverLimit: 100,
    deviceLimit: 150,
    ingestionLimitGbDay: 350,
    retentionDays: 90,
    userLimit: 50,
    e2eeSupported: true,
    features: [
      'Up to 100 monitored servers',
      '90-day telemetry retention',
      'Autonomous AI Root Cause Analysis',
      'Automated remediation runbooks',
      'Role-Based Access Control (RBAC)',
      'Custom SLA compliance reporting',
    ],
  },
  {
    id: 'Enterprise',
    name: 'Enterprise Tier',
    description: 'Dedicated isolated tenant infrastructure with custom limits & 99.99% SLA.',
    priceMonthly: 1499,
    priceAnnual: 14990,
    serverLimit: 500,
    deviceLimit: 1000,
    ingestionLimitGbDay: 1500,
    retentionDays: 365,
    userLimit: 250,
    e2eeSupported: true,
    features: [
      'Unlimited microservices & 500+ servers',
      '365-day cold telemetry archive',
      'Hardware security module (HSM) key derivation',
      'SOC2 Type II & HIPAA audit reports',
      '24/7/365 Dedicated SRE Hotline',
      'Custom billing & invoicing contracts',
    ],
  },
];

const mockUsage: UsageQuota = {
  monitoredServers: { used: 8, limit: 500 },
  registeredDevices: { used: 4, limit: 1000 },
  dailyIngestionGb: { used: 42.6, limit: 1500 },
  logRetentionDays: { current: 365, limit: 365 },
  traceRetentionDays: { current: 90, limit: 365 },
  users: { used: 6, limit: 250 },
  aiAnalysisQueries: { used: 1840, limit: 25000 },
};

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'aud-991',
    orgId: 'org-apex-enterprise',
    timestamp: '2026-11-20T14:26:15Z',
    actor: { id: 'usr-sarah-vance', email: 'sarah.vance@enterprise-apex.internal', role: 'Security Administrator' },
    action: 'tenant.crypto.key_rotated',
    targetType: 'TenantKey',
    targetId: 'key-org-apex-enterprise-v2',
    ipAddress: '198.51.100.42',
    metadata: { algorithm: 'HPKE-X25519-HKDF-AES256GCM', previousKeyStatus: 'retired' },
  },
  {
    id: 'aud-990',
    orgId: 'org-apex-enterprise',
    timestamp: '2026-11-20T14:19:40Z',
    actor: { id: 'system-apex-autonomous', email: 'autonomous-agent@apex.internal', role: 'Security Administrator' },
    action: 'remediation.runbook.executed',
    targetType: 'RemediationAction',
    targetId: 'act-clear-01',
    ipAddress: '10.140.24.1',
    metadata: { targetService: 'redis-cache', reclaimedBytes: '14.2GB' },
  },
  {
    id: 'aud-989',
    orgId: 'org-apex-enterprise',
    timestamp: '2026-11-20T12:00:00Z',
    actor: { id: 'usr-apex-alex-chen', email: 'alex.chen@enterprise-apex.internal', role: 'Owner' },
    action: 'organization.member.invited',
    targetType: 'OrgMember',
    targetId: 'mem-006',
    ipAddress: '198.51.100.12',
    metadata: { inviteeEmail: 'audits@compliance-firm.corp', assignedRole: 'Viewer' },
  },
  {
    id: 'aud-988',
    orgId: 'org-apex-enterprise',
    timestamp: '2026-11-19T18:40:00Z',
    actor: { id: 'usr-jordan-miller', email: 'jordan.miller@enterprise-apex.internal', role: 'Organization Administrator' },
    action: 'device.enrolled',
    targetType: 'DeviceRegistration',
    targetId: 'edge-sensor-us-east-k8s-01',
    ipAddress: '198.51.100.18',
    metadata: { hostname: 'k8s-worker-us-east-01', firmware: 'v3.4.1-hardened' },
  },
  {
    id: 'aud-987',
    orgId: 'org-apex-enterprise',
    timestamp: '2026-11-18T09:12:00Z',
    actor: { id: 'usr-marcus-brody', email: 'marcus.brody@enterprise-apex.internal', role: 'Billing Administrator' },
    action: 'subscription.payment_method.updated',
    targetType: 'Subscription',
    targetId: 'sub-enterprise-annual',
    ipAddress: '203.0.113.8',
    metadata: { cardBrand: 'Visa', last4: '4242' },
  },
];

const mockSessions: UserSession[] = [
  {
    id: 'sess-001',
    ipAddress: '198.51.100.42',
    userAgent: 'Chrome 131.0 on Windows 11 Enterprise',
    location: 'Ashburn, VA, United States',
    lastActive: 'Active right now',
    current: true,
  },
  {
    id: 'sess-002',
    ipAddress: '198.51.100.18',
    userAgent: 'Firefox 132.0 on macOS Sonoma',
    location: 'San Jose, CA, United States',
    lastActive: '2 hours ago',
    current: false,
  },
  {
    id: 'sess-003',
    ipAddress: '203.0.113.99',
    userAgent: 'APEX Mobile Console (iOS 18)',
    location: 'Frankfurt, Germany',
    lastActive: 'Yesterday at 18:40',
    current: false,
  },
];

export const saasApi = {
  async login(email: string, password: string): Promise<BackendAuthTokenResponse> {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);

    const response = await apiClient.post<BackendAuthTokenResponse>(
        '/api/v1/auth/login',
        form,
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        }
    );

    setAccessToken(response.data.access_token);
    return response.data;
},
  // GET /api/v1/saas/me
  async getCurrentUser(): Promise<User> {
    if (getStoredMockMode()) {
        return { ...mockUser };
    }

    const response = await apiClient.get<BackendUserResponse>(
        '/api/v1/auth/me'
    );

    return mapBackendUser(response.data);
},

  async switchOrganization(orgId: string): Promise<User> {
    mockUser.currentOrgId = orgId;
    return { ...mockUser };
  },

  // GET /api/v1/saas/organizations
  async getOrganizations(): Promise<Organization[]> {
    if (getStoredMockMode()) {
      return [...mockOrganizations];
    }
    try {
      const res = await apiClient.get<Organization[]>('/api/v1/saas/organizations');
      return res.data;
    } catch {
      return [...mockOrganizations];
    }
  },

  // POST /api/v1/saas/organizations
  async createOrganization(name: string, slug?: string): Promise<Organization> {
    const newOrg: Organization = {
      id: `org-apex-${Date.now().toString(36)}`,
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      ownerId: mockUser.id,
      createdAt: new Date().toISOString(),
      subscriptionPlan: 'Professional',
      memberCount: 1,
      maxMembers: 15,
      registeredDevicesCount: 0,
      e2eeEnabled: true,
      workspaces: [
        {
          id: `ws-${Date.now().toString(36)}`,
          orgId: `org-apex-${Date.now().toString(36)}`,
          name: 'Primary Workspace',
          environment: 'production',
          region: 'us-east-1',
          serverCount: 0,
          createdAt: new Date().toISOString(),
        },
      ],
      settings: {
        enforceMfa: true,
        ipAllowlist: [],
        allowedEmailDomains: [],
      },
    };

    if (getStoredMockMode()) {
      mockOrganizations.push(newOrg);
      return newOrg;
    }
    try {
      const res = await apiClient.post<Organization>('/api/v1/saas/organizations', { name, slug });
      return res.data;
    } catch {
      mockOrganizations.push(newOrg);
      return newOrg;
    }
  },

  // GET /api/v1/saas/organizations/{id}
  async getOrganization(id: string): Promise<Organization> {
    if (getStoredMockMode()) {
      const org = mockOrganizations.find((o) => o.id === id);
      if (org) return { ...org };
      return mockOrganizations[0];
    }
    try {
      const res = await apiClient.get<Organization>(`/api/v1/saas/organizations/${id}`);
      return res.data;
    } catch {
      return mockOrganizations[0];
    }
  },

  // GET /api/v1/saas/organizations/{id}/members
  async getMembers(orgId: string): Promise<OrgMember[]> {
    if (getStoredMockMode()) {
      return mockMembers.filter((m) => m.orgId === orgId);
    }
    try {
      const res = await apiClient.get<OrgMember[]>(`/api/v1/saas/organizations/${orgId}/members`);
      return res.data;
    } catch {
      return mockMembers.filter((m) => m.orgId === orgId);
    }
  },

  // POST /api/v1/saas/organizations/{id}/invitations
  async inviteMember(orgId: string, email: string, role: string): Promise<OrgInvitation> {
    const inv: OrgInvitation = {
      id: `inv-${Date.now().toString(36)}`,
      orgId,
      email,
      role: role as any,
      inviterName: mockUser.fullName,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'pending',
    };

    if (getStoredMockMode()) {
      mockMembers.push({
        id: `mem-${Date.now()}`,
        orgId,
        userId: `usr-${Date.now().toString(36)}`,
        email,
        fullName: email.split('@')[0],
        role: role as any,
        status: 'invited',
        invitedAt: new Date().toISOString(),
      });
      return inv;
    }

    try {
      const res = await apiClient.post<OrgInvitation>(`/api/v1/saas/organizations/${orgId}/invitations`, { email, role });
      return res.data;
    } catch {
      return inv;
    }
  },

  // DELETE /api/v1/saas/organizations/{id}/members/{memberId}
  async removeMember(orgId: string, memberId: string): Promise<{ success: boolean }> {
    if (getStoredMockMode()) {
      const idx = mockMembers.findIndex((m) => m.id === memberId && m.orgId === orgId);
      if (idx !== -1) mockMembers.splice(idx, 1);
      return { success: true };
    }
    try {
      await apiClient.delete(`/api/v1/saas/organizations/${orgId}/members/${memberId}`);
      return { success: true };
    } catch {
      return { success: true };
    }
  },

  // GET /api/v1/saas/plans
  async getPlans(): Promise<SubscriptionPlan[]> {
    if (getStoredMockMode()) {
      return [...mockPlans];
    }
    try {
      const res = await apiClient.get<SubscriptionPlan[]>('/api/v1/saas/plans');
      return res.data;
    } catch {
      return [...mockPlans];
    }
  },

  // GET /api/v1/saas/subscription
  async getSubscription(orgId = 'org-apex-enterprise'): Promise<OrganizationSubscription> {
    const sub: OrganizationSubscription = {
      orgId,
      planId: 'Enterprise',
      status: 'active',
      currentPeriodStart: '2026-08-10T00:00:00Z',
      currentPeriodEnd: '2027-08-10T00:00:00Z',
      cancelAtPeriodEnd: false,
      paymentMethod: {
        brand: 'Visa Corporate',
        last4: '4242',
        expiry: '12/28',
      },
    };
    if (getStoredMockMode()) return sub;
    try {
      const res = await apiClient.get<OrganizationSubscription>('/api/v1/saas/subscription');
      return res.data;
    } catch {
      return sub;
    }
  },

  // POST /api/v1/saas/subscription/checkout
  async createCheckoutSession(planId: string, annual = false): Promise<{ checkoutUrl: string }> {
    if (getStoredMockMode()) {
      return { checkoutUrl: `https://billing.provider.internal/checkout/session_mock_${planId}` };
    }
    try {
      const res = await apiClient.post<{ checkoutUrl: string }>('/api/v1/saas/subscription/checkout', { planId, annual });
      return res.data;
    } catch {
      return { checkoutUrl: `https://billing.provider.internal/checkout/session_mock_${planId}` };
    }
  },

  // GET /api/v1/saas/usage
  async getUsage(orgId = 'org-apex-enterprise'): Promise<UsageQuota> {
    if (getStoredMockMode()) return { ...mockUsage };
    try {
      const res = await apiClient.get<UsageQuota>('/api/v1/saas/usage');
      return res.data;
    } catch {
      return { ...mockUsage };
    }
  },

  // GET /api/v1/saas/audit-logs
  async getAuditLogs(orgId = 'org-apex-enterprise'): Promise<AuditLogEntry[]> {
    if (getStoredMockMode()) return [...mockAuditLogs];
    try {
      const res = await apiClient.get<AuditLogEntry[]>('/api/v1/saas/audit-logs');
      return res.data;
    } catch {
      return [...mockAuditLogs];
    }
  },

  // GET /api/v1/saas/devices
  async getDevices(): Promise<DeviceRegistration[]> {
    return integrityLockValidator.getDevices();
  },

  // POST /api/v1/saas/devices/enroll
  async enrollDevice(device: Parameters<typeof integrityLockValidator.enrollDevice>[0]): Promise<DeviceRegistration> {
    return integrityLockValidator.enrollDevice(device);
  },

  // POST /api/v1/saas/devices/{id}/revoke
  async revokeDevice(deviceId: string): Promise<boolean> {
    return integrityLockValidator.revokeDevice(deviceId);
  },

  // GET /api/v1/saas/security/keys
  async getTenantKeys(): Promise<TenantKeyRecord[]> {
    if (!keyManager.isVaultUnlocked()) {
      await keyManager.unlockVault('org-apex-enterprise');
    }
    return keyManager.getRegisteredKeys();
  },

  // POST /api/v1/saas/security/keys/rotate
  async rotateTenantKey(): Promise<TenantKeyRecord> {
    const newKey = await keyManager.rotateKey();
    mockAuditLogs.unshift({
      id: `aud-${Date.now()}`,
      orgId: 'org-apex-enterprise',
      timestamp: new Date().toISOString(),
      actor: { id: mockUser.id, email: mockUser.email, role: 'Owner' },
      action: 'tenant.crypto.key_rotated',
      targetType: 'TenantKey',
      targetId: newKey.keyId,
      ipAddress: '198.51.100.42',
      metadata: { algorithm: newKey.algorithm, version: newKey.version },
    });
    return newKey;
  },

  // GET /api/v1/saas/sessions
  async getActiveSessions(): Promise<UserSession[]> {
    return [...mockSessions];
  },
};
