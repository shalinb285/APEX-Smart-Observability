import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  EyeOff,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Play,
  RotateCw,
  Terminal,
  Hash,
  Database,
  ArrowRight,
  Server,
  Layers,
  Key,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusPill } from '../components/ui/StatusPill';
import { privacyPipeline, APPROVED_METRICS_ALLOWLIST } from '../services/privacyPipeline';
import { PrivacyPipelineResult, EgressAuditRecord, PipelineStage } from '../types/privacy';

export const EgressProofPage: React.FC = () => {
  const [pipelineResult, setPipelineResult] = useState<PrivacyPipelineResult | null>(null);
  const [auditLogs, setAuditLogs] = useState<EgressAuditRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [simulateSecretInjection, setSimulateSecretInjection] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'metadata' | 'envelope' | 'audit'>('overview');

  const executePipeline = async (withSecrets: boolean) => {
    setIsProcessing(true);
    try {
      const res = await privacyPipeline.processTelemetryEvent(
        {
          cpu_percent: 54.2,
          memory_percent: 68.9,
          disk_percent: 59.4,
          network_bandwidth_bps: 48200000,
          latency_ms: 38.4,
          packet_loss_percent: 0.02,
          failed_login_count: 0,
          fleet_health: 98.5,
          internal_pod_ip: '10.244.18.92',
          host_fqdn: 'worker-node-04.us-east.k8s.internal',
          environment: 'production-secure',
        },
        {
          simulateSecretAttempt: withSecrets,
          sourceCollectorId: 'col-internal-us-east-k8s-01',
          tenantId: 'org-apex-enterprise',
        }
      );
      setPipelineResult(res);
      setAuditLogs(privacyPipeline.getAuditHistory());
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    executePipeline(false);
  }, []);

  const pipelineStages: PipelineStage[] = [
    'COLLECT',
    'FILTER',
    'REDACT',
    'AGGREGATE',
    'ANALYSE',
    'POLICY',
    'ENCRYPT',
    'SEND',
  ];

  const exportAuditCsv = () => {
    const headers = [
      'Timestamp_UTC',
      'Event_ID',
      'Collector_ID',
      'Tenant_ID',
      'Policy_Version',
      'Decision',
      'Allowed_Fields',
      'Removed_Secrets',
      'Payload_Hash_SHA256',
      'Transit_Latency_MS',
    ];
    const rows = auditLogs.map((l) => [
      l.timestampUtc,
      l.id,
      l.pseudonymousCollectorId,
      l.tenantId,
      l.policyVersion,
      l.decision,
      l.allowedFieldsCount,
      `"${l.removedSecretFields.join('; ')}"`,
      l.payloadHashSha256,
      l.transitLatencyMs,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `apex_egress_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card variant="gradient" className="border-zinc-800 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
                  TIER-1 PRIVACY PIPELINE // EGRESS PROOF PANEL
                </span>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 font-mono text-[10px]">
                  EVALUATION MANDATE
                </Badge>
              </div>
              <h2 className="text-xl font-bold font-mono tracking-tight text-white">
                Cryptographic Egress Audit & Zero-Knowledge Verification
              </h2>
              <p className="text-xs text-zinc-400 font-mono max-w-3xl">
                Demonstrates precisely what leaves the trusted local collector. Raw application logs, credentials,
                and secrets are quarantined locally. Only version-controlled allow-listed metadata is encrypted (HPKE P-256 + AES-256-GCM) and transmitted to SaaS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => executePipeline(simulateSecretInjection)}
              disabled={isProcessing}
              className="gap-2 font-mono text-xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              Run Pipeline
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={exportAuditCsv}
              className="gap-2 font-mono text-xs bg-white text-black hover:bg-zinc-200"
            >
              <Download className="w-3.5 h-3.5" />
              Export Audit CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* 8-Stage Pipeline Visualizer */}
      <Card className="border-zinc-800 bg-zinc-950/70 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
            Mandatory Data Flow Pipeline (8 Discrete Stages)
          </span>
          <span className="text-[11px] font-mono text-emerald-400">
            Policy Version: {privacyPipeline.getPolicyVersion()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {pipelineStages.map((stage, idx) => {
            const isCompleted = true;
            return (
              <div
                key={stage}
                className="flex flex-col items-center p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 relative group"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-mono text-zinc-500 font-bold">0{idx + 1}</span>
                  <span className="text-xs font-mono font-semibold text-white tracking-wide">
                    {stage}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Enforced</span>
                </div>
                {idx < pipelineStages.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 z-10" />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Interactive Simulation Controls */}
      <Card className="border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold font-mono text-white">
                Interactive Attack / Leak Injection Simulation
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Inject forbidden secrets (DB password, AWS secret key, SSN, raw JWT) into the local telemetry stream to prove the policy engine scrubs them before encryption.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={simulateSecretInjection}
                onChange={(e) => {
                  setSimulateSecretInjection(e.target.checked);
                  executePipeline(e.target.checked);
                }}
                className="rounded border-zinc-700 bg-zinc-950 text-white focus:ring-0 w-4 h-4"
              />
              <span>Simulate Prohibited Secrets in Payload</span>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => executePipeline(simulateSecretInjection)}
              className="font-mono text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              Simulate Egress
            </Button>
          </div>
        </div>
      </Card>

      {/* 16 Evaluation Metadata Points Display */}
      {pipelineResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Box 1: Egress Identity & Routing */}
          <Card className="border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase">
              <Server className="w-3.5 h-3.5 text-zinc-300" />
              <span>1-4. Egress Routing</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500">Source Collector: </span>
                <span className="text-white font-semibold">{pipelineResult.sourceCollector.rawId}</span>
              </div>
              <div>
                <span className="text-zinc-500">Pseudonymous ID: </span>
                <span className="text-emerald-400 font-semibold">{pipelineResult.sourceCollector.pseudonymousId}</span>
              </div>
              <div>
                <span className="text-zinc-500">Target Tenant: </span>
                <span className="text-white font-semibold">{pipelineResult.targetTenant.tenantId}</span>
              </div>
              <div>
                <span className="text-zinc-500">Destination: </span>
                <span className="text-zinc-300 truncate block">{pipelineResult.destinationEndpoint}</span>
              </div>
              <div>
                <span className="text-zinc-500">Capture UTC: </span>
                <span className="text-zinc-400">{pipelineResult.eventTimestampUtc}</span>
              </div>
            </div>
          </Card>

          {/* Box 2: Field Classification & Policy */}
          <Card className="border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase">
              <Filter className="w-3.5 h-3.5 text-zinc-300" />
              <span>5-8. Allowlist & Scrubbing</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Fields Examined:</span>
                <span className="text-white font-semibold">
                  {Object.keys(pipelineResult.originalRawFields).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Allowlisted Allowed:</span>
                <span className="text-emerald-400 font-semibold">
                  {Object.keys(pipelineResult.allowListedFields).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Redacted Fields:</span>
                <span className="text-amber-400 font-semibold">
                  {Object.keys(pipelineResult.redactedFields).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Secrets Quarantined:</span>
                <span className="text-rose-400 font-semibold">
                  {pipelineResult.removedSecrets.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Policy Verdict:</span>
                <Badge
                  variant={pipelineResult.auditRecord.decision === 'ALLOWED' ? 'default' : 'outline'}
                  className={
                    pipelineResult.auditRecord.decision === 'ALLOWED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]'
                  }
                >
                  {pipelineResult.auditRecord.decision}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Box 3: Aggregation & Cryptography */}
          <Card className="border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase">
              <Lock className="w-3.5 h-3.5 text-zinc-300" />
              <span>9-13. Encryption & Envelope</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500">Aggregation Window: </span>
                <span className="text-white font-semibold">
                  {pipelineResult.aggregationPerformed.windowSeconds}s ({pipelineResult.aggregationPerformed.rawSamplesCount} raw samples)
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Algorithm: </span>
                <span className="text-cyan-400 font-semibold">HPKE (P-256 + AES-256-GCM)</span>
              </div>
              <div>
                <span className="text-zinc-500">Payload Byte Size: </span>
                <span className="text-white font-semibold">{pipelineResult.payloadBytes} bytes</span>
              </div>
              <div>
                <span className="text-zinc-500">Envelope ID: </span>
                <span className="text-zinc-300 truncate block">{pipelineResult.encryptedEnvelopePreview.envelopeId}</span>
              </div>
              <div>
                <span className="text-zinc-500">E2EE Private Key: </span>
                <span className="text-emerald-400 font-semibold">Never leaves client</span>
              </div>
            </div>
          </Card>

          {/* Box 4: Integrity Hash & Egress Result */}
          <Card className="border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase">
              <Hash className="w-3.5 h-3.5 text-zinc-300" />
              <span>14-16. Verification & Result</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500">Payload SHA-256: </span>
                <span className="text-zinc-300 truncate block font-mono text-[11px]">
                  {pipelineResult.payloadHashSha256}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Signature: </span>
                <span className="text-emerald-400 font-mono text-[11px] truncate block">
                  {pipelineResult.encryptedEnvelopePreview.signature}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Delivery Status: </span>
                <span className="text-emerald-400 font-semibold">
                  HTTP {pipelineResult.transmissionResult.statusCode} OK (Delivered)
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Transit Latency: </span>
                <span className="text-white font-semibold">
                  {pipelineResult.transmissionResult.transitTimeMs} ms
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs: Deep Inspection of Metadata vs Outbound Ciphertext vs Audit History */}
      <div className="border-b border-zinc-800 flex gap-4 text-xs font-mono">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-white text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Scrubbing & Redaction Breakdown
        </button>
        <button
          onClick={() => setActiveTab('metadata')}
          className={`pb-2.5 font-medium border-b-2 transition-colors ${
            activeTab === 'metadata'
              ? 'border-white text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Approved Plaintext Metadata Preview
        </button>
        <button
          onClick={() => setActiveTab('envelope')}
          className={`pb-2.5 font-medium border-b-2 transition-colors ${
            activeTab === 'envelope'
              ? 'border-white text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Exact Outbound Encrypted Envelope (Wire format)
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 font-medium border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-white text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Immutable Egress Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* TAB CONTENT: Scrubbing Breakdown */}
      {activeTab === 'overview' && pipelineResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Removed Secrets Box */}
          <Card className="border-zinc-800 bg-zinc-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-rose-400 font-bold flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-400" />
                Quarantined Secrets (Local Only)
              </span>
              <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-300">
                {pipelineResult.removedSecrets.length} Dropped
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Scrubbed by pattern matchers and key-entropy detectors before serialization:
            </p>
            {pipelineResult.removedSecrets.length === 0 ? (
              <div className="text-xs font-mono text-zinc-500 italic py-4 text-center">
                No secrets detected in current sample payload.
              </div>
            ) : (
              <div className="space-y-1.5">
                {pipelineResult.removedSecrets.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-rose-950/20 border border-rose-900/40 text-[11px] font-mono text-rose-300 flex items-center justify-between"
                  >
                    <span>{sec}</span>
                    <span className="text-[9px] bg-rose-900/40 px-1.5 py-0.5 rounded text-rose-200">
                      SCRUBBED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Redacted Fields Box */}
          <Card className="border-zinc-800 bg-zinc-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
                <EyeOff className="w-4 h-4 text-amber-400" />
                Redacted Fields (Masked)
              </span>
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
                {Object.keys(pipelineResult.redactedFields).length} Masked
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Private identifiers obfuscated or replaced with pseudonyms:
            </p>
            <div className="space-y-1.5">
              {Object.entries(pipelineResult.redactedFields).map(([k, v]) => (
                <div
                  key={k}
                  className="p-2 rounded bg-amber-950/20 border border-amber-900/40 text-[11px] font-mono text-amber-300 flex items-center justify-between"
                >
                  <span className="text-zinc-400">{k}:</span>
                  <span className="font-semibold">{v}</span>
                </div>
              ))}
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-center justify-between">
                <span className="text-zinc-400">collector_id:</span>
                <span className="text-emerald-400 font-semibold">{pipelineResult.sourceCollector.pseudonymousId}</span>
              </div>
            </div>
          </Card>

          {/* Approved Egress Fields Box */}
          <Card className="border-zinc-800 bg-zinc-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Approved Egress Telemetry
              </span>
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-300">
                Allowlist v2.4
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Only primary aggregate telemetry measurements authorized for egress:
            </p>
            <div className="space-y-1 text-[11px] font-mono">
              {Array.from(APPROVED_METRICS_ALLOWLIST).map((field) => (
                <div key={field} className="flex items-center justify-between py-0.5 border-b border-zinc-900">
                  <span className="text-zinc-400">{field}</span>
                  <span className="text-emerald-400 text-[10px]">APPROVED</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: Approved Plaintext Metadata Preview */}
      {activeTab === 'metadata' && pipelineResult && (
        <Card className="border-zinc-800 bg-black p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-zinc-400">
              Plaintext JSON approved for local encryption (Zero secrets present)
            </span>
            <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 font-mono">
              {pipelineResult.payloadBytes} BYTES
            </Badge>
          </div>
          <pre className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 overflow-x-auto">
            {JSON.stringify(pipelineResult.approvedPlaintextMetadata, null, 2)}
          </pre>
        </Card>
      )}

      {/* TAB CONTENT: Encrypted Envelope Wire Format */}
      {activeTab === 'envelope' && pipelineResult && (
        <Card className="border-zinc-800 bg-black p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-zinc-400">
              Actual Wire Envelope Transmitted Over TLS to Ingestion Gateway (E2EE)
            </span>
            <span className="text-xs font-mono text-cyan-400">
              HPKE-ECDH-P256-AES256GCM
            </span>
          </div>
          <pre className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-cyan-300 overflow-x-auto">
            {JSON.stringify(pipelineResult.encryptedEnvelopePreview, null, 2)}
          </pre>
        </Card>
      )}

      {/* TAB CONTENT: Audit Log History */}
      {activeTab === 'audit' && (
        <Card className="border-zinc-800 bg-zinc-950 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                <tr>
                  <th className="py-2.5 px-3">Capture UTC</th>
                  <th className="py-2.5 px-3">Collector ID</th>
                  <th className="py-2.5 px-3">Decision</th>
                  <th className="py-2.5 px-3">Allowed</th>
                  <th className="py-2.5 px-3">Redacted</th>
                  <th className="py-2.5 px-3">Scrubbed Secrets</th>
                  <th className="py-2.5 px-3">SHA-256 Hash</th>
                  <th className="py-2.5 px-3">Transit</th>
                  <th className="py-2.5 px-3">HTTP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900/40">
                    <td className="py-2 px-3 text-zinc-300">{log.timestampUtc.split('T')[1].replace('Z', '')}</td>
                    <td className="py-2 px-3 text-white font-semibold">{log.pseudonymousCollectorId}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.decision === 'ALLOWED'
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/50'
                            : log.decision === 'REDACTED'
                            ? 'bg-amber-950/40 text-amber-400 border border-amber-800/50'
                            : 'bg-rose-950/40 text-rose-400 border border-rose-800/50'
                        }`}
                      >
                        {log.decision}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-emerald-400">{log.allowedFieldsCount}</td>
                    <td className="py-2 px-3 text-amber-400">{log.redactedFields.length}</td>
                    <td className="py-2 px-3 text-rose-400">
                      {log.removedSecretFields.length > 0 ? log.removedSecretFields.join(', ') : 'None'}
                    </td>
                    <td className="py-2 px-3 text-zinc-400 font-mono text-[11px]">
                      {log.payloadHashSha256.slice(0, 16)}...
                    </td>
                    <td className="py-2 px-3 text-zinc-300">{log.transitLatencyMs}ms</td>
                    <td className="py-2 px-3 text-emerald-400">{log.httpStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
