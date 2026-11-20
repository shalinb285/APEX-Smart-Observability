// APEX Product Health & Freshness Classification Engine
// Evaluates telemetry against transparent operational thresholds.
// Supports 4 Product Health States: EXCELLENT, GOOD, FAIR, POOR
// Supports 3 Freshness States: FRESH, STALE, OFFLINE

export type ProductHealthState = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
export type FreshnessState = 'FRESH' | 'STALE' | 'OFFLINE';

export interface HealthThresholdConfig {
  cpuWarning: number; // default 75%
  cpuCritical: number; // default 90%
  memoryWarning: number; // default 80%
  memoryCritical: number; // default 92%
  diskWarning: number; // default 80%
  diskCritical: number; // default 90%
  latencyWarningMs: number; // default 150ms
  latencyCriticalMs: number; // default 400ms
  packetLossWarningPercent: number; // default 1.0%
  packetLossCriticalPercent: number; // default 3.0%
  staleThresholdSeconds: number; // default 10s
  offlineThresholdSeconds: number; // default 60s
}

export interface HealthEvaluationResult {
  state: ProductHealthState;
  freshness: FreshnessState;
  score: number; // 0 - 100
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
  packetLossWarningPercent: 1.0,
  packetLossCriticalPercent: 3.0,
  staleThresholdSeconds: 10,
  offlineThresholdSeconds: 60,
};

export class HealthScoringEngine {
  private thresholds: HealthThresholdConfig = { ...DEFAULT_HEALTH_THRESHOLDS };
  private lastSeenTimestampMs = Date.now();
  private lastEvaluatedResult: HealthEvaluationResult | null = null;

  public getThresholds(): HealthThresholdConfig {
    return { ...this.thresholds };
  }

  public updateThresholds(updated: Partial<HealthThresholdConfig>): void {
    this.thresholds = { ...this.thresholds, ...updated };
  }

  public setLastSeen(timestampMs: number): void {
    this.lastSeenTimestampMs = timestampMs;
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
    const cpu = metrics.cpu ?? 52.4;
    const memory = metrics.memory ?? 68.1;
    const disk = metrics.disk ?? 58.0;
    const latency = metrics.latency ?? 42.0;
    const packetLoss = metrics.packetLoss ?? 0.05;
    const failedLogins = metrics.failedLogins ?? 0;

    let eventTimeMs = nowMs;
    if (metrics.timestamp) {
      eventTimeMs = typeof metrics.timestamp === 'number' ? metrics.timestamp : new Date(metrics.timestamp).getTime();
      this.lastSeenTimestampMs = Math.max(this.lastSeenTimestampMs, eventTimeMs);
    }

    const secondsSinceLastUpdate = Math.max(0, Math.floor((nowMs - this.lastSeenTimestampMs) / 1000));

    // Freshness evaluation
    let freshness: FreshnessState = 'FRESH';
    if (secondsSinceLastUpdate > this.thresholds.offlineThresholdSeconds) {
      freshness = 'OFFLINE';
    } else if (secondsSinceLastUpdate > this.thresholds.staleThresholdSeconds) {
      freshness = 'STALE';
    }

    // Metric Status Checks
    const cpuStatus = cpu >= this.thresholds.cpuCritical ? 'critical' : cpu >= this.thresholds.cpuWarning ? 'warning' : 'nominal';
    const memStatus = memory >= this.thresholds.memoryCritical ? 'critical' : memory >= this.thresholds.memoryWarning ? 'warning' : 'nominal';
    const diskStatus = disk >= this.thresholds.diskCritical ? 'critical' : disk >= this.thresholds.diskWarning ? 'warning' : 'nominal';
    const latStatus = latency >= this.thresholds.latencyCriticalMs ? 'critical' : latency >= this.thresholds.latencyWarningMs ? 'warning' : 'nominal';
    const plStatus = packetLoss >= this.thresholds.packetLossCriticalPercent ? 'critical' : packetLoss >= this.thresholds.packetLossWarningPercent ? 'warning' : 'nominal';
    const flStatus = failedLogins >= 25 ? 'critical' : failedLogins >= 5 ? 'warning' : 'nominal';

    const criticalCount = [cpuStatus, memStatus, diskStatus, latStatus, plStatus, flStatus].filter((s) => s === 'critical').length;
    const warningCount = [cpuStatus, memStatus, diskStatus, latStatus, plStatus, flStatus].filter((s) => s === 'warning').length;

    // Four Product Health States Assignment
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
    } else if (criticalCount >= 1 || (cpuStatus === 'critical' && latStatus === 'critical')) {
      state = 'POOR';
      if (cpuStatus === 'critical') {
        triggeringMetric = 'CPU Utilization';
        triggeringValue = `${cpu.toFixed(1)}%`;
        triggeringThreshold = `>${this.thresholds.cpuCritical}%`;
        reason = `Critical CPU saturation (${cpu.toFixed(1)}%) exceeding threshold (${this.thresholds.cpuCritical}%).`;
      } else if (latStatus === 'critical') {
        triggeringMetric = 'P95 Latency';
        triggeringValue = `${latency.toFixed(1)}ms`;
        triggeringThreshold = `>${this.thresholds.latencyCriticalMs}ms`;
        reason = `Severe latency degradation (${latency.toFixed(1)}ms) crossing critical threshold.`;
      } else if (memStatus === 'critical') {
        triggeringMetric = 'Memory Utilization';
        triggeringValue = `${memory.toFixed(1)}%`;
        triggeringThreshold = `>${this.thresholds.memoryCritical}%`;
        reason = `OOM Risk: Memory capacity saturated at ${memory.toFixed(1)}%.`;
      } else {
        triggeringMetric = 'Packet Loss';
        triggeringValue = `${packetLoss.toFixed(2)}%`;
        triggeringThreshold = `>${this.thresholds.packetLossCriticalPercent}%`;
        reason = `High packet loss (${packetLoss.toFixed(2)}%) causing transmission aborts.`;
      }
    } else if (warningCount >= 2 || plStatus === 'warning' || latStatus === 'warning') {
      state = 'FAIR';
      triggeringMetric = latStatus === 'warning' ? 'P95 Latency' : 'Resource Utilization';
      triggeringValue = latStatus === 'warning' ? `${latency.toFixed(1)}ms` : `${warningCount} warnings active`;
      triggeringThreshold = `>${this.thresholds.latencyWarningMs}ms / 2 warnings`;
      reason = 'Persistent degradation detected across multiple telemetry vectors.';
    } else if (warningCount === 1) {
      state = 'GOOD';
      if (cpuStatus === 'warning') {
        triggeringMetric = 'CPU Utilization';
        triggeringValue = `${cpu.toFixed(1)}%`;
        triggeringThreshold = `>${this.thresholds.cpuWarning}%`;
        reason = `Minor CPU deviation (${cpu.toFixed(1)}%) observed, fleet remains functional.`;
      } else {
        triggeringMetric = 'Resource Warning';
        triggeringValue = '1 Signal Elevated';
        triggeringThreshold = 'Warning Band';
        reason = 'Isolated minor metric elevation; automatic baseline tracking active.';
      }
    }

    // Score computation
    let score = 100;
    if (state === 'GOOD') score = 84;
    else if (state === 'FAIR') score = 65;
    else if (state === 'POOR') score = 38;

    const result: HealthEvaluationResult = {
      state,
      freshness,
      score,
      latestEventTimestampUtc: new Date(eventTimeMs).toISOString(),
      lastSuccessfulUpdateUtc: new Date(this.lastSeenTimestampMs).toISOString(),
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
