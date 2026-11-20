# APEX // CICADA 2K26 HACKATHON DEMO SCRIPT & Q&A GUIDE
## 4-Phase Evaluation Sheet Guide for Judges & Presenters

---

## Phase 1: Problem Understanding & Ideation

### Q1. Before observability, what was the situation?
**Our Response:**
> "Prior to implementing APEX, organizations faced five critical architectural bottlenecks:
> 1. **Limited Visibility**: Teams operated with fragmented, siloed monitoring tools that only checked basic ping or CPU thresholds without context.
> 2. **Delayed Fault Detection**: Outages were discovered by end-users filing support tickets rather than automated detection (Mean Time to Detect exceeded 45 minutes).
> 3. **Reactive Troubleshooting**: Engineers spent hours manually SSH-ing into servers and grepping gigabytes of raw logs across microservices.
> 4. **No Failure Correlation**: Cascading failures (such as a database connection leak causing upstream API thread starvation) appeared as isolated, unrelated alerts.
> 5. **Severe Privacy Risks**: Legacy cloud APM agents routinely streamed unredacted application logs, database connection strings, JWT auth tokens, and customer PII straight into third-party cloud data centers, violating HIPAA, SOC 2, and GDPR mandates."

### Q2. What does the team observe now?
**Our Response:**
> "APEX observes all six primary telemetry measurements required by the specification:
> 1. **CPU Utilization (%)**
> 2. **Memory Utilization (%)**
> 3. **Disk Utilization (%)**
> 4. **Network Bandwidth (bps)**
> 5. **Microservice P95 Latency (ms)**
> 6. **Network Packet Loss (%)**
>
> In addition, APEX captures:
> - **Failed Login Counts** (detecting brute-force credential stuffing).
> - **Fleet Health Ratios** across all registered clusters.
> - **Data Freshness** (FRESH / STALE / OFFLINE tracking with exact timestamps).
> - **Contextual Anomaly Scores** derived from multi-signal correlation.
>
> **Privacy Guarantee**: Raw logs, database credentials, API keys, and customer PII **stay strictly inside the customer's local environment**. Only allow-listed, windowed aggregate measurements leave the collector, encrypted end-to-end with tenant-controlled keys."

---

## Phase 2: Architecture & Technical Design

### Key Demonstration Points:
1. **Two-Tier Architecture**:
   - Tier 1 runs locally inside the organizer's perimeter.
   - Tier 2 provides authenticated SaaS ingestion, multi-tenant isolation, and device registration.
2. **8-Stage Privacy Pipeline**:
   - `COLLECT` → `FILTER` → `REDACT` → `AGGREGATE` → `ANALYSE` → `POLICY` → `ENCRYPT` → `SEND`.
3. **Public-Key Envelope Encryption (HPKE)**:
   - Uses WebCrypto ECDH (NIST P-256) for key derivation.
   - Symmetric payload encryption with AES-256-GCM and fresh 12-byte IVs.
   - SaaS backend possesses zero private keys and cannot decrypt customer telemetry.
4. **Telemetry Integrity Lock**:
   - Every frame contains an Ed25519 signature, monotonic sequence counter (`#14820` $\to$ `#14821`), and hash-chain link preventing replay and tampering.
5. **Multi-Tenant Separation**:
   - Distinct database namespaces, cryptographic key records, and RBAC rules for independent organizations (e.g. *Apex Global Technologies* vs. *Cyberdyne Defense Systems*).

---

## Phase 3: Implementation & Working Prototype

### Live Walkthrough Script:
1. **Show the 4 Product Health States**:
   - Open `/` (Overview Dashboard). Point out the **Product Health Banner**:
     - Status: `EXCELLENT` (Score: 94/100).
     - Freshness: `FRESH` (Updated 2s ago).
     - Triggering metric, threshold, and reason explicitly displayed.
2. **Show the Egress Proof Panel (Mandatory Evaluation Part 8)**:
   - Navigate to `/egress-proof` via sidebar.
   - Show the 8-stage visual pipeline: `COLLECT` through `SEND`.
   - Point out all 16 evaluation points:
     - Source collector ID (`col-internal-us-east-k8s-01` $\to$ pseudonymous `col-edge-94f8-us-east`).
     - Allowed fields count vs. scrubbed secrets.
     - Outbound encrypted envelope JSON vs. approved plaintext preview.
     - Click **"Simulate Prohibited Secrets in Payload"** and click **"Run Pipeline"**.
     - Demonstrate that `db_root_password`, `aws_secret_key`, and `customer_ssn` are immediately scrubbed and zero secrets enter the encrypted envelope.
     - Click **"Export Audit CSV"** to demonstrate compliance export.
3. **Show the Telemetry Integrity Lock**:
   - Navigate to `/integrity-lock`.
   - Show registered devices and their monotonic sequence numbers.
   - Click **"Test Replay Attack"**: Gateway immediately rejects previously seen Event ID.
   - Click **"Test Tampered Sig"**: Bit-flipped ciphertext fails Ed25519 verification.
   - Click **"Test Sequence Gap"**: Sequence skip quarantined.
   - Click **"Revoke Device"**: Device immediately marked `REVOKED`.
4. **Show Multi-Tenant Isolation**:
   - Navigate to `/tenants`.
   - Click **"Prove Cross-Tenant Isolation"**:
     - System executes cross-tenant query for *Cyberdyne Defense Systems* data.
     - Demonstrates HTTP 403 authorization denial.
     - Proves cryptographic dual-defense: even if ciphertext was intercepted, Tenant A's private key fails ECDH derivation, causing GCM auth tag mismatch.
5. **Show Organizer Stream Simulator & 10 Scenarios**:
   - Navigate to `/stream-simulator`.
   - Show the **Telemetry Latency Clock**:
     - `t_source` $\to$ `t_collector` (+8ms) $\to$ `t_saas` (+37ms) $\to$ `t_browser` (+17ms) = **62ms Total E2E Latency**.
     - Proves compliance with Part 11: 62ms is 161x faster than the 10-second SLA limit.
   - Inject **"2. CPU Utilization Spike"**:
     - Watch Overview health instantly transition to `POOR` with triggering reason: *"Critical CPU saturation (94.8%) exceeding threshold (>90%)"*.
   - Inject **"9. Collector Disconnection & Stale Telemetry"**:
     - Watch freshness transition to `OFFLINE` (>60s) and health mark `POOR`.
   - Inject **"11. Outage Recovery & Normalization"**:
     - Watch health smoothly recover to `EXCELLENT`.
   - Show **Reconciliation Ledger**: Expected: 32, Accepted: 31, Duplicates Rejected: 1, Lost Events: 0.
6. **Run Live 12 Automated Verification Tests**:
   - Click **"VERIFY TESTS (12/12)"** in the top navigation bar.
   - Click **"Run All 12 Tests"**.
   - Watch all 12 tests execute live in browser WebCrypto with green `PASSED` badges in under 400ms!

---

## Phase 4: Final Presentation & Judge Q&A Preparation

### Expected Judge Questions & Authoritative Answers:

#### Q: How can you prove that the SaaS cloud backend never sees raw customer data?
**Answer:**
> "By architecture and mathematical proof. First, the local collector executes an explicit allowlist engine (Allowlist v2.4); any field not explicitly registered is dropped before serialization. Second, the collector executes HPKE envelope encryption using the tenant's public key (NIST P-256) and AES-256-GCM. The ciphertext transmitted over the wire can only be decrypted by the tenant's private key, which is kept exclusively in browser heap memory on the customer's machine. The SaaS backend only stores the base64 ciphertext and integrity lock metadata."

#### Q: What happens if an attacker intercepts the encrypted telemetry in transit?
**Answer:**
> "Even with a complete wiretap, an attacker only gains access to opaque base64 AES-256-GCM ciphertext. Without the tenant's P-256 private key, recovering the plaintext is computationally infeasible. Furthermore, every envelope is protected by an Ed25519 digital signature and a 128-bit GCM authentication tag. If an attacker modifies even a single bit of ciphertext, decryption fails with `AEAD_BAD_TAG_OR_CIPHERTEXT` and the payload is discarded."

#### Q: How do you prevent replay attacks if an attacker records an encrypted packet and resends it?
**Answer:**
> "APEX enforces a dual replay defense:
> 1. **Unique Event ID Tracking**: The ingestion gateway maintains an in-memory hash index of all processed `eventId`s. Any duplicate event ID is rejected with HTTP 409 Conflict.
> 2. **Monotonic Sequence Numbers**: Every collector increments a strict monotonic counter (`#14820` $\to$ `#14821`). If an attacker resends an older sequence number, the gateway rejects it immediately (`incoming_seq <= last_committed_seq`)."

#### Q: How does your AIOps distinguish real outages from alert noise?
**Answer:**
> "APEX moves beyond crude static thresholds by implementing multi-signal contextual correlation:
> - Rather than firing 15 separate alerts when a database slows down, APEX correlates CPU elevation, P95 latency surge, and packet discards simultaneously across peer collectors.
> - It exposes the exact mathematical weights of contributing signals (e.g. CPU 40%, Latency 35%, Packet Loss 25%), root cause hypothesis, and evidence trail.
> - Safe remediation actions support dry-run simulation and require two-step operator confirmation before touching production infrastructure."

#### Q: How did you preserve the existing frontend while adding enterprise SaaS capabilities?
**Answer:**
> "We adhered strictly to non-negotiable frontend preservation:
> - All 11 original monitoring pages, charts, layouts, black-and-white theme, and WebSocket implementations remain 100% intact.
> - New SaaS functionality was implemented purely additively through dedicated route extensions (`/egress-proof`, `/integrity-lock`, `/tenants`, `/stream-simulator`), transparent decryption adapters, and modular contexts."
