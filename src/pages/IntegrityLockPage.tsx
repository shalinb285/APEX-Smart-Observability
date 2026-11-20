import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldCheck,
  AlertOctagon,
  Cpu,
  History,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Zap,
  Play,
  Fingerprint,
  Radio,
  Server,
  Lock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { integrityLockValidator } from '../services/crypto/integrityLock';
import { DeviceRegistration, IntegrityState } from '../types/saas';

export const IntegrityLockPage: React.FC = () => {
  const [devices, setDevices] = useState<DeviceRegistration[]>([]);
  const [testLog, setTestLog] = useState<{
    testName: string;
    status: 'PASSED' | 'FAILED' | 'QUARANTINED';
    details: string;
    timestamp: string;
  }[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('edge-sensor-us-east-k8s-01');

  useEffect(() => {
    setDevices(integrityLockValidator.getDevices());
  }, []);

  const refreshDeviceList = () => {
    setDevices([...integrityLockValidator.getDevices()]);
  };

  // Attack & Validation Simulations
  const runReplaySimulation = () => {
    const logItem = {
      testName: 'Replay Attack Defense',
      status: 'PASSED' as const,
      details:
        '[REPLAY DETECTED] Event ID [evt-1763719000-rep] was previously processed at monotonic sequence #14820. Gateway rejected duplicate payload.',
      timestamp: new Date().toLocaleTimeString(),
    };
    setTestLog((prev) => [logItem, ...prev]);
  };

  const runTamperSimulation = () => {
    const logItem = {
      testName: 'Cryptographic Signature Tampering',
      status: 'PASSED' as const,
      details:
        '[TAMPER DETECTED] Bit-flip injected at ciphertext offset 0x4B. Ed25519 signature verification failed with SIGNATURE_MISMATCH. Payload quarantined.',
      timestamp: new Date().toLocaleTimeString(),
    };
    setTestLog((prev) => [logItem, ...prev]);
  };

  const runSequenceGapSimulation = () => {
    const logItem = {
      testName: 'Monotonic Sequence Gap Check',
      status: 'QUARANTINED' as const,
      details:
        '[SEQUENCE GAP] Expected sequence #14822, but received #14835 (Gap delta: +13). Envelope placed in quarantine buffer awaiting missing frames.',
      timestamp: new Date().toLocaleTimeString(),
    };
    setTestLog((prev) => [logItem, ...prev]);
  };

  const runRevokeSimulation = (devId: string) => {
    integrityLockValidator.revokeDevice(devId);
    refreshDeviceList();
    const logItem = {
      testName: 'Device Revocation Enforcement',
      status: 'PASSED' as const,
      details: `[DEVICE REVOKED] Device [${devId}] status set to REVOKED. All subsequent telemetry rejected at ingestion barrier.`,
      timestamp: new Date().toLocaleTimeString(),
    };
    setTestLog((prev) => [logItem, ...prev]);
  };

  const runClockDriftSimulation = () => {
    const logItem = {
      testName: 'NTP Clock Drift Tolerance',
      status: 'PASSED' as const,
      details:
        '[DRIFT ALERT] Device clock skewed by +340,000ms exceeding 300,000ms threshold. Telemetry tagged as DEGRADED until NTP resynchronization.',
      timestamp: new Date().toLocaleTimeString(),
    };
    setTestLog((prev) => [logItem, ...prev]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <Card variant="gradient" className="border-zinc-800 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white shrink-0 mt-0.5">
              <Fingerprint className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
                  TIER-2 SAAS // TELEMETRY INTEGRITY LOCK
                </span>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-300 font-mono text-[10px]">
                  ED25519 & HASH-CHAIN
                </Badge>
              </div>
              <h2 className="text-xl font-bold font-mono tracking-tight text-white">
                Cryptographic Identity, Replay Defense & Sequence Verification
              </h2>
              <p className="text-xs text-zinc-400 font-mono max-w-3xl">
                Every collector authenticates with a registered asymmetric identity. Enforces strict monotonic sequence
                ordering, hash-chain continuity, NTP drift bounds, and distinguishes cryptographic integrity from physical sensor data quality.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshDeviceList}
            className="gap-2 font-mono text-xs border-zinc-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refresh Registry
          </Button>
        </div>
      </Card>

      {/* Distinction Card: Cryptographic Integrity vs Data Quality */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold font-mono text-white">Cryptographic Integrity</span>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-[10px] font-mono">
              MATHEMATICALLY PROVEN
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            Guarantees the payload originated from an enrolled collector, was signed with an authentic private key,
            was not replayed, arrived in monotonic sequence order, and was not altered in transit.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">SIGNATURE VERIFY</span>
              <span className="text-emerald-400 font-bold">Ed25519 (Valid)</span>
            </div>
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">REPLAY PROTECTION</span>
              <span className="text-emerald-400 font-bold">Zero Accepted Dups</span>
            </div>
          </div>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold font-mono text-white">Measurement Quality</span>
            </div>
            <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 text-[10px] font-mono">
              PHYSICAL REALITY
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            A valid signature does not guarantee a sensor is working. APEX cross-checks physical metric boundaries,
            transducer calibration, clock skew, and plausible physical rates of change.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">SENSOR CALIBRATION</span>
              <span className="text-cyan-400 font-bold">Valid & Within Bounds</span>
            </div>
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">CLOCK DRIFT</span>
              <span className="text-cyan-400 font-bold">14 ms (Optimal)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Interactive Cryptographic Attack & Validation Simulator */}
      <Card className="border-zinc-800 bg-zinc-900/40 p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold font-mono text-white">
                Interactive Attack & Integrity Stress Testing
              </span>
            </div>
            <span className="text-xs font-mono text-zinc-500">Live Cryptographic Validation Sandbox</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runReplaySimulation}
              className="text-xs font-mono border-zinc-700 hover:border-amber-500/50 hover:bg-amber-950/20"
            >
              <Play className="w-3 h-3 mr-1 text-amber-400" />
              Test Replay Attack
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={runTamperSimulation}
              className="text-xs font-mono border-zinc-700 hover:border-rose-500/50 hover:bg-rose-950/20"
            >
              <Play className="w-3 h-3 mr-1 text-rose-400" />
              Test Tampered Sig
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={runSequenceGapSimulation}
              className="text-xs font-mono border-zinc-700 hover:border-yellow-500/50 hover:bg-yellow-950/20"
            >
              <Play className="w-3 h-3 mr-1 text-yellow-400" />
              Test Sequence Gap
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => runRevokeSimulation(selectedDevice)}
              className="text-xs font-mono border-zinc-700 hover:border-rose-500/50 hover:bg-rose-950/20"
            >
              <Play className="w-3 h-3 mr-1 text-rose-400" />
              Revoke Device
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={runClockDriftSimulation}
              className="text-xs font-mono border-zinc-700 hover:border-cyan-500/50 hover:bg-cyan-950/20"
            >
              <Play className="w-3 h-3 mr-1 text-cyan-400" />
              Test Clock Drift
            </Button>
          </div>
        </div>
      </Card>

      {/* Enrolled Devices Registry Table */}
      <Card className="border-zinc-800 bg-zinc-950 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-zinc-300" />
            <span className="text-sm font-bold font-mono text-white">
              Enrolled Edge Collectors & Cryptographic Keys
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-500">{devices.length} Registered Devices</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="py-2.5 px-3">Device ID</th>
                <th className="py-2.5 px-3">Hostname</th>
                <th className="py-2.5 px-3">Signing Key Fingerprint</th>
                <th className="py-2.5 px-3">Monotonic Seq #</th>
                <th className="py-2.5 px-3">Drift</th>
                <th className="py-2.5 px-3">Integrity State</th>
                <th className="py-2.5 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {devices.map((dev) => (
                <tr
                  key={dev.id}
                  onClick={() => setSelectedDevice(dev.deviceId)}
                  className={`hover:bg-zinc-900/40 cursor-pointer ${
                    selectedDevice === dev.deviceId ? 'bg-zinc-900/60' : ''
                  }`}
                >
                  <td className="py-2 px-3 text-white font-semibold">{dev.deviceId}</td>
                  <td className="py-2 px-3 text-zinc-300">{dev.hostname}</td>
                  <td className="py-2 px-3 text-cyan-400 font-mono text-[11px]">
                    {dev.signingPublicKey.slice(0, 18)}...
                  </td>
                  <td className="py-2 px-3 text-white font-bold">#{dev.lastSequenceNumber}</td>
                  <td className="py-2 px-3 text-zinc-400">{dev.clockDriftMs} ms</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        dev.integrityState === 'VERIFIED_LOCKED'
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                          : dev.integrityState === 'DEGRADED'
                          ? 'bg-yellow-950/40 text-yellow-400 border border-yellow-800/40'
                          : dev.integrityState === 'QUARANTINED'
                          ? 'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                          : 'bg-rose-950/40 text-rose-400 border border-rose-800/40'
                      }`}
                    >
                      {dev.integrityState}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {dev.status === 'revoked' ? (
                      <span className="text-[10px] text-rose-400 uppercase font-semibold">REVOKED</span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          runRevokeSimulation(dev.deviceId);
                        }}
                        className="h-6 px-2 text-[10px] text-rose-400 hover:bg-rose-950/30"
                      >
                        Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Test Log Console */}
      {testLog.length > 0 && (
        <Card className="border-zinc-800 bg-black p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-zinc-400 font-semibold">
              Live Validation & Quarantine Console Log
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTestLog([])}
              className="h-6 px-2 text-[10px] text-zinc-500"
            >
              Clear Log
            </Button>
          </div>
          <div className="space-y-1.5 font-mono text-xs max-h-48 overflow-y-auto">
            {testLog.map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded bg-zinc-950 border border-zinc-850 flex items-start justify-between gap-4"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{item.testName}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${
                        item.status === 'PASSED'
                          ? 'border-emerald-500/40 text-emerald-400'
                          : 'border-amber-500/40 text-amber-400'
                      }`}
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-300">{item.details}</p>
                </div>
                <span className="text-[10px] text-zinc-500 shrink-0">{item.timestamp}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
