# APEX // SHARED INTEGRATION CONTRACT
## Frontend / SaaS / Local Collector Technical Specifications
### Version: 2.4.0-hardened | CICADA 2K26 Final Specification

---

## 1. Architectural Boundaries & Ownership

1. **Local Collector Developer Owns**:
   - Local raw event ingestion and durable spooling (`/var/spool/apex`).
   - 8-stage privacy pipeline implementation (Scrubbing, Redaction, Aggregation).
   - Local policy evaluation and deny-by-default allowlist enforcement.
   - Outbound HPKE envelope construction, Ed25519 signing, and HTTPS egress.
2. **SaaS Backend Developer Owns**:
   - Ingestion gateway (`/api/v1/telemetry/ingest`), mutual TLS (mTLS), and device authentication.
   - Cryptographic integrity lock validation (Signature, Replay filter, Monotonic sequence).
   - Multi-tenant tenant namespace segregation, RBAC enforcement, and encrypted envelope persistence.
   - Authenticated WebSocket push to authorized web browser clients.
3. **Frontend Developer Owns**:
   - Tenant-aware presentation and organization switcher.
   - In-memory client-side WebCrypto key vault management and local payload decryption.
   - Real-time 4-state product health and freshness indicators.
   - Egress Proof Panel with 16 verification points and audit log export.
   - Explainable AIOps contextual root cause visualization and safe 2-step remediation execution.

---

## 2. Shared Data Flow & Privacy Contract

```
[Local Telemetry Source]
         │
         ▼
[1. COLLECT]  --->  Raw metrics, logs, internal IPs, auth tokens
         │
         ▼
[2. FILTER]   --->  Scrub passwords, API keys, tokens, SSNs (Local quarantine)
         │
         ▼
[3. REDACT]   --->  Mask internal IPs (10.244.***.***) & pseudonymize collector IDs
         │
         ▼
[4. AGGREGATE]--->  Compute 10s P95 latency, mean CPU/RAM, peak bandwidth
         │
         ▼
[5. ANALYSE]  --->  Compute local Z-score anomaly deviation
         │
         ▼
[6. POLICY]   --->  Drop any field not in Allowlist v2.4 (Deny by default)
         │
         ▼
[7. ENCRYPT]  --->  Wrap approved JSON via HPKE (ECDH P-256 + AES-256-GCM)
         │
         ▼
[8. SEND]     --->  Sign with Ed25519 & transmit over TLS
```

### Absolute Invariant:
> **The SaaS backend and network transit layer must NEVER receive raw logs, credentials, unredacted host IP addresses, or tenant private decryption keys.**

---

## 3. Version-Controlled Allowlist Schema (v2.4)

Only fields matching the following keys are permitted in `approvedPlaintextMetadata.metrics`:

| Metric Name | Type | Unit | Range | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cpu_percent` | float | `%` | `0.0 – 100.0` | Aggregated CPU utilization (Mean). |
| `memory_percent` | float | `%` | `0.0 – 100.0` | Resident memory utilization (Mean). |
| `disk_percent` | float | `%` | `0.0 – 100.0` | Primary mount disk utilization (Peak). |
| `network_bandwidth_bps` | int | `bps` | `0 – 100,000,000,000` | Aggregated network throughput (Peak). |
| `latency_ms` | float | `ms` | `0.0 – 60,000.0` | P95 microservice response latency. |
| `packet_loss_percent` | float | `%` | `0.0 – 100.0` | Network packet discard percentage. |
| `failed_login_count` | int | count | `0 – 1,000,000` | Failed authentication attempts in window. |
| `fleet_health` | float | `%` | `0.0 – 100.0` | Ratio of healthy cluster nodes. |
| `anomaly_score` | float | score | `0.00 – 1.00` | Local contextual deviation score. |

---

## 4. Encrypted Telemetry Wire Envelope

Transmitted via `POST /api/v1/telemetry/ingest`:

```json
{
  "version": "1.0",
  "envelopeId": "env-1763719000120-a8f9b2",
  "tenantId": "org-apex-enterprise",
  "keyId": "key-org-apex-enterprise-v1",
  "ephemeralPublicKey": "BMbF8c01PqR+m34JkLv99a8s9df7as7df8a7sdf...==",
  "iv": "v981f9a8df7a8sd7",
  "wrappedDataKey": "wrapIvBase64:wrappedDekCiphertextBase64",
  "ciphertext": "89fa0df98a0sdf98as0df98a0sdf89a0sd8f...==",
  "authTag": "89a7sdf89a7sdf8==",
  "integrityLock": {
    "eventId": "evt-1763719000-k8s01",
    "deviceId": "col-edge-94f8-us-east",
    "sequenceNumber": 14821,
    "timestamp": 1763719000000,
    "schemaVersion": "v2.4",
    "previousHash": "9f83a2c0e184df29cba48392ef89312a",
    "deviceSignature": "ed25519-sig-9f83a2c0e184df29cba48392",
    "measurementQuality": {
      "sensorCalibrated": true,
      "metricUnitsValid": true,
      "expectedRangeCompliant": true,
      "clockSkewMs": 14,
      "sensorHealthStatus": "nominal"
    }
  }
}
```

---

## 5. Gateway Ingestion API Contract

### Ingest Encrypted Telemetry
- **Method**: `POST`
- **Path**: `/api/v1/telemetry/ingest`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Apex-Device-Id: col-edge-94f8-us-east`
  - `X-Apex-Tenant-Id: org-apex-enterprise`
  - `X-Apex-Signature: <base64-ed25519-sig>`

#### Response Codes:
- `200 OK`: Telemetry envelope successfully verified and persisted.
- `400 Bad Request`: Schema validation failure or unknown payload format.
- `401 Unauthorized`: Device identity unregistered or revoked.
- `403 Forbidden`: Tenant membership violation.
- `409 Conflict`: Replay attack or duplicate sequence detected (`DUPLICATE_EVENT_REJECTED`).
- `422 Unprocessable Entity`: Monotonic sequence gap or clock drift > 300,000ms (`QUARANTINED`).

---

## 6. WebSocket Streaming Specification

- **Endpoint**: `wss://gateway.apex-cloud.io/ws/telemetry?tenant_id={tenantId}&token={token}`
- **Message Types**:
  1. `telemetry_envelope`: Pushes encrypted envelope directly to client for local WebCrypto decryption.
  2. `device_status`: Real-time collector heartbeat and sequence progress.
  3. `alert_trigger`: Contextual AIOps alert notification.
