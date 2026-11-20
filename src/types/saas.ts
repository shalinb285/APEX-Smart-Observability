// APEX SaaS & Tier-2 E2EE Type Definitions

export type UserRole =
  | 'Owner'
  | 'Organization Administrator'
  | 'Security Administrator'
  | 'Engineer'
  | 'Viewer'
  | 'Billing Administrator';

export type Permission =
  | 'telemetry:read'
  | 'telemetry:write'
  | 'remediation:execute'
  | 'org:admin'
  | 'org:billing'
  | 'security:keys'
  | 'security:devices'
  | 'members:invite'
  | 'members:manage'
  | 'audit:read';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  currentOrgId: string;
  roles: Record<string, UserRole>; // orgId -> role
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  idToken?: string;
}

export interface Workspace {
  id: string;
  orgId: string;
  name: string;
  environment: 'production' | 'staging' | 'development';
  region: string;
  serverCount: number;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  subscriptionPlan: PlanTier;
  memberCount: number;
  maxMembers: number;
  workspaces: Workspace[];
  registeredDevicesCount: number;
  e2eeEnabled: boolean;
  settings: {
    enforceMfa: boolean;
    ipAllowlist: string[];
    allowedEmailDomains: string[];
  };
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: 'active' | 'invited' | 'suspended';
  invitedAt: string;
  joinedAt?: string;
}

export interface OrgInvitation {
  id: string;
  orgId: string;
  email: string;
  role: UserRole;
  inviterName: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

export type PlanTier = 'Starter' | 'Professional' | 'Business' | 'Enterprise';

export interface SubscriptionPlan {
  id: PlanTier;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  serverLimit: number;
  deviceLimit: number;
  ingestionLimitGbDay: number;
  retentionDays: number;
  userLimit: number;
  e2eeSupported: boolean;
  features: string[];
}

export interface OrganizationSubscription {
  orgId: string;
  planId: PlanTier;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  paymentMethod?: {
    brand: string;
    last4: string;
    expiry: string;
  };
}

export interface Invoice {
  id: string;
  orgId: string;
  invoiceNumber: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: 'paid' | 'open' | 'void';
  periodStart: string;
  periodEnd: string;
  pdfUrl?: string;
  hostedInvoiceUrl?: string;
}

export interface UsageQuota {
  monitoredServers: { used: number; limit: number };
  registeredDevices: { used: number; limit: number };
  dailyIngestionGb: { used: number; limit: number };
  logRetentionDays: { current: number; limit: number };
  traceRetentionDays: { current: number; limit: number };
  users: { used: number; limit: number };
  aiAnalysisQueries: { used: number; limit: number };
}

export interface AuditLogEntry {
  id: string;
  orgId: string;
  timestamp: string;
  actor: {
    id: string;
    email: string;
    role: string;
  };
  action: string;
  targetType: string;
  targetId: string;
  ipAddress: string;
  metadata?: Record<string, unknown>;
}

// -------------------------------------------------------------
// Cryptographic & E2EE Telemetry Integrity Lock Specifications
// -------------------------------------------------------------

export type IntegrityState = 'VERIFIED_LOCKED' | 'DEGRADED' | 'QUARANTINED' | 'REVOKED';

export interface MeasurementQuality {
  sensorCalibrated: boolean;
  metricUnitsValid: boolean;
  expectedRangeCompliant: boolean;
  clockSkewMs: number;
  sensorHealthStatus: 'nominal' | 'degraded' | 'fault';
}

export interface TelemetryIntegrityLock {
  eventId: string;
  deviceId: string;
  sequenceNumber: number;
  timestamp: number;
  schemaVersion: string;
  previousHash: string; // SHA-256 chain
  deviceSignature: string; // Ed25519 / HMAC signature
  measurementQuality: MeasurementQuality;
}

export interface EncryptedTelemetryEnvelope {
  version: '1.0';
  envelopeId: string;
  tenantId: string;
  keyId: string;
  ephemeralPublicKey: string; // base64 ECDH / X25519 public key
  iv: string; // base64 12-byte IV
  wrappedDataKey: string; // base64 DEK encrypted with shared secret
  ciphertext: string; // base64 payload
  authTag: string; // base64 GCM auth tag
  integrityLock: TelemetryIntegrityLock;
}

export interface DeviceRegistration {
  id: string;
  deviceId: string;
  hostname: string;
  tenantId: string;
  signingPublicKey: string; // Ed25519 public key base64
  firmwareVersion: string;
  status: 'active' | 'quarantined' | 'revoked';
  lastSeen: string;
  lastSequenceNumber: number;
  clockDriftMs: number;
  integrityState: IntegrityState;
  enrolledAt: string;
  enrolledBy: string;
}

export interface TenantKeyRecord {
  keyId: string;
  version: number;
  algorithm: 'HPKE-X25519-HKDF-AES256GCM';
  publicKeyPem: string;
  createdAt: string;
  status: 'active' | 'retired' | 'compromised';
  fingerprint: string;
}

export interface UserSession {
  id: string;
  ipAddress: string;
  userAgent: string;
  location: string;
  lastActive: string;
  current: boolean;
}
