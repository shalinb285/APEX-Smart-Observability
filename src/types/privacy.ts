// APEX Tier-1 Privacy Pipeline & Egress Proof Types
// Strictly defines allowable metadata, redaction policies, and audit trails.

export type EgressDecision = 'ALLOWED' | 'REDACTED' | 'BLOCKED_BY_POLICY';

export type PipelineStage =
  | 'COLLECT'
  | 'FILTER'
  | 'REDACT'
  | 'AGGREGATE'
  | 'ANALYSE'
  | 'POLICY'
  | 'ENCRYPT'
  | 'SEND';

export interface PrivacyPolicyRule {
  id: string;
  fieldPattern: string;
  action: 'allow' | 'redact' | 'drop' | 'reject_event';
  description: string;
  dataClassification: 'PUBLIC' | 'RESTRICTED_METRIC' | 'LOCAL_ONLY_SECRET' | 'PII';
}

export interface EgressAuditRecord {
  id: string;
  timestampUtc: string;
  collectorId: string;
  pseudonymousCollectorId: string;
  tenantId: string;
  targetEndpoint: string;
  policyVersion: string;
  decision: EgressDecision;
  totalFieldsExamined: number;
  allowedFieldsCount: number;
  redactedFields: string[];
  removedSecretFields: string[];
  aggregationSummary: string;
  payloadByteSize: number;
  payloadHashSha256: string;
  encryptionAlgorithm: string;
  signatureVerified: boolean;
  transitLatencyMs: number;
  httpStatus: number;
}

export interface PrivacyPipelineResult {
  stage: PipelineStage;
  success: boolean;
  eventTimestampUtc: string;
  sourceCollector: {
    rawId: string;
    pseudonymousId: string;
    internalIp: string;
    region: string;
  };
  targetTenant: {
    tenantId: string;
    opaqueTenantRef: string;
  };
  destinationEndpoint: string;
  originalRawFields: Record<string, unknown>;
  allowListedFields: Record<string, unknown>;
  redactedFields: Record<string, string>;
  removedSecrets: string[];
  aggregationPerformed: {
    windowSeconds: number;
    rawSamplesCount: number;
    p95LatencyMs: number;
    meanCpuPercent: number;
    peakBandwidthBps: number;
  };
  policyVersion: string;
  approvedPlaintextMetadata: Record<string, unknown>;
  encryptedEnvelopePreview: {
    version: string;
    envelopeId: string;
    ephemeralPublicKey: string;
    iv: string;
    wrappedDataKey: string;
    ciphertext: string;
    authTag: string;
    payloadHashSha256: string;
    signature: string;
  };
  payloadBytes: number;
  payloadHashSha256: string;
  encryptionStatus: 'ENCRYPTED_AES256_GCM_HPKE' | 'PLAINTEXT_PROHIBITED';
  transmissionResult: {
    delivered: boolean;
    statusCode: number;
    transitTimeMs: number;
    saasReceiptTimeUtc: string;
  };
  auditRecord: EgressAuditRecord;
}

export interface TelemetryClockBreakdown {
  t_source_utc: string;
  t_collector_utc: string;
  t_saas_utc: string;
  t_browser_utc: string;
  t_alert_utc?: string;
  delta_collector_ms: number;
  delta_saas_ingest_ms: number;
  delta_browser_render_ms: number;
  delta_e2e_total_ms: number;
  sla_dashboard_visibility_pass: boolean; // < 10,000ms
  sla_alert_generation_pass: boolean; // < 15,000ms
  sla_offline_detection_pass: boolean; // < 60,000ms
}
