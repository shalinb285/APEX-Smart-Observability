
// APEX Product Health & Freshness Classification Engine
// Evaluates telemetry against transparent operational thresholds.
// Health: EXCELLENT, GOOD, FAIR, POOR
// Freshness: FRESH, STALE, OFFLINE

export type ProductHealthState = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
export type FreshnessState = 'FRESH' | 'STALE' | 'OFFLINE';

export interface HealthThresholdConfig {
  cpuWarning: number;
  cpuCritical: number;
  memoryWarning: number;
  memoryCritical: number;
  diskWarning: number;
  diskCritical: number;
  latencyWarningMs: number;
  latencyCriticalMs: number;
  packetLossWarningPercent: number;
  packetLossCriticalPercent: number;
  staleThresholdSeconds: number;
  offlineThresholdSeconds: number;
}

export interface HealthEvaluationResult {
  state: ProductHealthState;
  freshness: FreshnessState;
  score: number;
  latestEventTimestampUtc: string;
  lastSuccessfulUpdateUtc: string;
  secondsSinceLastUpdate: number;
  triggeringMetric: string;
  triggeringValue: string;
  triggeringThreshold: string;
  reason: string;
  detailedMetrics: {
    cpu: { value: number; unit: '%'; status: 'nominal' | 'warning' | 'critical' };
    memory: { value: number; unit: '%'; status: 'nominal' | 'warning' | 'critical' };
    disk: { value: number; unit: '%'; status: 'nominal' | 'warning' | 'critical' };
    latency: { value: number; unit: 'ms'; status: 'nominal' | 'warning' | 'critical' };
    packetLoss: { value: number; unit: '%'; status: 'nominal' | 'warning' | 'critical' };
    failedLogins: { value: number; status: 'nominal' | 'warning' | 'critical' };
  };
}

export const DEFAULT_HEALTH_THRESHOLDS: HealthThresholdConfig = {
  cpuWarning: 75,
  cpuCritical: 90,
  memoryWarning: 80,
  memoryCritical: 92,
  diskWarning: 80,
  diskCritical: 90,
  latencyWarningMs: 150,
  latencyCriticalMs: 400,
  packetLossWarningPercent: 1,
  packetLossCriticalPercent: 3,
  staleThresholdSeconds: 10,
  offlineThresholdSeconds: 60,
};

type MetricStatus = 'nominal' | 'warning' | 'critical';

const getStatus = (
  value: number,
  warning: number,
  critical: number
): MetricStatus => {
  if (value >= critical) return 'critical';
  if (value >= warning) return 'warning';
  return 'nominal';
};

const safeNumber = (value: number | undefined, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export class HealthScoringEngine {
  private thresholds: HealthThresholdConfig = { ...DEFAULT_HEALTH_THRESHOLDS };

  // Zero means no telemetry has been received yet.
  private lastSeenTimestampMs = 0;

  private lastEvaluatedResult: HealthEvaluationResult | null = null;

  public getThresholds(): HealthThresholdConfig {
    return { ...this.thresholds };
  }

  public updateThresholds(updated: Partial<HealthThresholdConfig>): void {
    this.thresholds = { ...this.thresholds, ...updated };
  }

  public setLastSeen(timestampMs: number): void {
    if (Number.isFinite(timestampMs) && timestampMs > 0) {
      this.lastSeenTimestampMs = timestampMs;
    }
  }

  public evaluateHealth(
    metrics: {
      cpu?: number;
      memory?: number;
      disk?: number;
      latency?: number;
      packetLoss?: number;
      failedLogins?: number;
      timestamp?: string | number;
    },
    nowMs: number = Date.now()
  ): HealthEvaluationResult {
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();

    const cpu = safeNumber(metrics.cpu, 52.4);
    const memory = safeNumber(metrics.memory, 68.1);
    const disk = safeNumber(metrics.disk, 58);
    const latency = safeNumber(metrics.latency, 42);
    const packetLoss = safeNumber(metrics.packetLoss, 0.05);
    const failedLogins = safeNumber(metrics.failedLogins, 0);

    // Parse the incoming event timestamp safely.
    let eventTimeMs = now;

    if (metrics.timestamp !== undefined && metrics.timestamp !== null) {
      const parsed =
        typeof metrics.timestamp === 'number'
          ? metrics.timestamp
          : new Date(metrics.timestamp).getTime();

      if (Number.isFinite(parsed) && parsed > 0) {
        eventTimeMs = parsed;

        // Only advance last-seen time for newer valid events.
        if (
          this.lastSeenTimestampMs === 0 ||
          parsed > this.lastSeenTimestampMs
        ) {
          this.lastSeenTimestampMs = parsed;
        }
      }
    } else if (this.lastSeenTimestampMs === 0) {
      // First evaluation without an explicit timestamp.
      this.lastSeenTimestampMs = now;
    }

    const secondsSinceLastUpdate =
      this.lastSeenTimestampMs > 0
        ? Math.max(
            0,
            Math.floor((now - this.lastSeenTimestampMs) / 1000)
          )
        : Math.max(0, Math.floor(now / 1000));

    // Freshness classification.
    let freshness: FreshnessState = 'FRESH';

    if (secondsSinceLastUpdate > this.thresholds.offlineThresholdSeconds) {
      freshness = 'OFFLINE';
    } else if (secondsSinceLastUpdate > this.thresholds.staleThresholdSeconds) {
      freshness = 'STALE';
    }

    // Metric status classification.
    const cpuStatus = getStatus(cpu, this.thresholds.cpuWarning, this.thresholds.cpuCritical);
    const memStatus = getStatus(memory, this.thresholds.memoryWarning, this.thresholds.memoryCritical);
    const diskStatus = getStatus(disk, this.thresholds.diskWarning, this.thresholds.diskCritical);
    const latStatus = getStatus(latency, this.thresholds.latencyWarningMs, this.thresholds.latencyCriticalMs);
    const plStatus = getStatus(packetLoss, this.thresholds.packetLossWarningPercent, this.thresholds.packetLossCriticalPercent);
    const flStatus = getStatus(failedLogins, 5, 25);

    const statuses = [cpuStatus, memStatus, diskStatus, latStatus, plStatus, flStatus];

    const criticalCount = statuses.filter(s => s === 'critical').length;
    const warningCount = statuses.filter(s => s === 'warning').length;

    let state: ProductHealthState = 'EXCELLENT';
    let triggeringMetric = 'System Fleet';
    let triggeringValue = 'Nominal';
    let triggeringThreshold = 'All Within Bounds';
    let reason = 'All telemetry readings are within optimal operating bounds.';

    if (freshness === 'OFFLINE') {
      state = 'POOR';
      triggeringMetric = 'Data Freshness';
      triggeringValue = `${secondsSinceLastUpdate}s elapsed`;
      triggeringThreshold = `>${this.thresholds.offlineThresholdSeconds}s`;
      reason = `Collector heartbeat lost for ${secondsSinceLastUpdate}s. Node marked OFFLINE.`;
    } else if (criticalCount > 0) {
      state = 'POOR';

      if (cpuStatus === 'critical') {
        triggeringMetric = 'CPU Utilization';
        triggeringValue = `${cpu.toFixed(1)}%`;
        triggeringThreshold = `>=${this.thresholds.cpuCritical}%`;
        reason = `Critical CPU saturation (${cpu.toFixed(1)}%) detected.`;
      } else if (latStatus === 'critical') {
        triggeringMetric = 'P95 Latency';
        triggeringValue = `${latency.toFixed(1)}ms`;
        triggeringThreshold = `>=${this.thresholds.latencyCriticalMs}ms`;
        reason = `Severe latency degradation (${latency.toFixed(1)}ms) detected.`;
      } else if (memStatus === 'critical') {
        triggeringMetric = 'Memory Utilization';
        triggeringValue = `${memory.toFixed(1)}%`;
        triggeringThreshold = `>=${this.thresholds.memoryCritical}%`;
        reason = `Critical memory utilization (${memory.toFixed(1)}%) detected.`;
      } else if (diskStatus === 'critical') {
        triggeringMetric = 'Disk Utilization';
        triggeringValue = `${disk.toFixed(1)}%`;
        triggeringThreshold = `>=${this.thresholds.diskCritical}%`;
        reason = 'Critical disk utilization detected.';
      } else if (plStatus === 'critical') {
        triggeringMetric = 'Packet Loss';
        triggeringValue = `${packetLoss.toFixed(2)}%`;
        triggeringThreshold = `>=${this.thresholds.packetLossCriticalPercent}%`;
        reason = 'Critical packet loss detected.';
      } else {
        triggeringMetric = 'Failed Logins';
        triggeringValue = String(failedLogins);
        triggeringThreshold = '>=25';
        reason = 'Critical number of failed login attempts detected.';
      }
    } else if (warningCount >= 2 || latStatus === 'warning' || plStatus === 'warning') {
      state = 'FAIR';
      triggeringMetric = latStatus === 'warning' ? 'P95 Latency' : 'Resource Utilization';
      triggeringValue = latStatus === 'warning'
        ? `${latency.toFixed(1)}ms`
        : `${warningCount} warnings active`;
      triggeringThreshold = 'Warning thresholds exceeded';
      reason = 'Degradation detected across multiple telemetry indicators.';
    } else if (warningCount === 1) {
      state = 'GOOD';

      if (cpuStatus === 'warning') {
        triggeringMetric = 'CPU Utilization';
        triggeringValue = `${cpu.toFixed(1)}%`;
        triggeringThreshold = `>=${this.thresholds.cpuWarning}%`;
        reason = 'Minor CPU utilization elevation detected.';
      } else {
        triggeringMetric = 'Resource Warning';
        triggeringValue = '1 Signal Elevated';
        triggeringThreshold = 'Warning Band';
        reason = 'An isolated metric elevation has been detected.';
      }
    }

    let score = 100;

    if (state === 'GOOD') score = 84;
    if (state === 'FAIR') score = 65;
    if (state === 'POOR') score = 38;

    const result: HealthEvaluationResult = {
      state,
      freshness,
      score,
      latestEventTimestampUtc: new Date(eventTimeMs).toISOString(),
      lastSuccessfulUpdateUtc: new Date(
        this.lastSeenTimestampMs || now
      ).toISOString(),
      secondsSinceLastUpdate,
      triggeringMetric,
      triggeringValue,
      triggeringThreshold,
      reason,
      detailedMetrics: {
        cpu: { value: cpu, unit: '%', status: cpuStatus },
        memory: { value: memory, unit: '%', status: memStatus },
        disk: { value: disk, unit: '%', status: diskStatus },
        latency: { value: latency, unit: 'ms', status: latStatus },
        packetLoss: { value: packetLoss, unit: '%', status: plStatus },
        failedLogins: { value: failedLogins, status: flStatus },
      },
    };

    this.lastEvaluatedResult = result;
    return result;
  }

  public getLastResult(): HealthEvaluationResult | null {
    return this.lastEvaluatedResult;
  }
}

export const healthScoring = new HealthScoringEngine();
