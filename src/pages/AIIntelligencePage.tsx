import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  GitBranch,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  Activity,
  Zap,
  RotateCcw,
  Wrench,
} from 'lucide-react';
import {
  AnomalyItem,
  PredictionForecast,
  RootCauseAnalysis,
  AIRecommendation,
} from '../types';
import { api } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusPill } from '../components/ui/StatusPill';
import { Tabs } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const AIIntelligencePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'anomalies' | 'predictions' | 'rca' | 'recommendations'>('rca');
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [predictions, setPredictions] = useState<PredictionForecast[]>([]);
  const [rca, setRca] = useState<RootCauseAnalysis | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionForecast | null>(null);

  useEffect(() => {
    const loadAIData = async () => {
      try {
        const [anomData, predData, rcaData] = await Promise.all([
          api.getAnomalies(),
          api.getPredictions(),
          api.getRootCause(),
        ]);
        setAnomalies(anomData);
        setPredictions(predData);
        setRca(rcaData);
        if (predData.length > 0) {
          setSelectedPrediction(predData[0]);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadAIData();
  }, []);

  const tabs = [
    { id: 'rca', label: 'Root Cause Analysis', icon: <GitBranch className="w-3.5 h-3.5 text-white" /> },
    { id: 'anomalies', label: 'Anomaly Detection', count: anomalies.length, icon: <AlertTriangle className="w-3.5 h-3.5 text-zinc-300" /> },
    { id: 'predictions', label: 'Predictive Forecasting', count: predictions.length, icon: <TrendingUp className="w-3.5 h-3.5 text-white" /> },
    { id: 'recommendations', label: 'AI Remediation Plan', count: 4, icon: <Zap className="w-3.5 h-3.5 text-zinc-300" /> },
  ];

  return (
    <div className="space-y-6">
      {/* AI Hero Banner */}
      <Card variant="gradient" className="border-zinc-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-glow-white text-white">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-300 font-bold">
                  APEX AI ENGINE // NEURAL CORRELATION
                </span>
                <Badge variant="outline" dot>
                  MODEL CONFIDENCE: 96.5%
                </Badge>
              </div>
              <h2 className="text-lg font-bold font-mono text-white mt-1">
                Autonomous Anomaly Detection &amp; Predictive Analytics
              </h2>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/remediation')}
            icon={<Wrench className="w-3.5 h-3.5" />}
            className="text-xs font-mono"
          >
            EXECUTE REMEDIATIONS
          </Button>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as any)} />

      {/* TAB 1: Root Cause Analysis (RCA) */}
      {activeTab === 'rca' && rca && (
        <div className="space-y-6">
          <Card className="border-zinc-700">
            <CardHeader>
              <div>
                <CardTitle className="text-white">
                  <GitBranch className="w-4 h-4 text-white" />
                  Correlated Incident Root Cause Analysis // {rca.id}
                </CardTitle>
                <CardDescription>Generated at {rca.timestamp} based on cross-cluster telemetry vectors</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="critical">
                  CONFIDENCE: {rca.confidenceScore}%
                </Badge>
              </div>
            </CardHeader>

            {/* Core Issue & Suspected Cause */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-white font-bold">
                  Primary Issue Detected
                </span>
                <h4 className="text-base font-bold font-mono text-white">{rca.issue}</h4>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                  {rca.suspectedRootCause}
                </p>
              </div>

              {/* Grid: Affected Services & Correlated Telemetry Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                {/* Affected Services */}
                <div className="p-4 rounded-xl bg-black border border-zinc-800 space-y-2.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-white" />
                    Impacted Dependency Chain ({rca.affectedServices.length} Services)
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {rca.affectedServices.map((svc) => (
                      <span
                        key={svc}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs font-semibold"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Related Metrics */}
                <div className="p-4 rounded-xl bg-black border border-zinc-800 space-y-2.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-white" />
                    Correlated Anomaly Metrics
                  </span>
                  <div className="space-y-1.5 pt-1">
                    {rca.relatedMetrics.map((met, i) => (
                      <div key={i} className="flex items-center gap-2 text-zinc-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        <span>{met}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Evidence Points */}
              <div className="p-4 rounded-xl bg-black border border-zinc-800 space-y-2.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Autonomous Corroborating Evidence
                </span>
                <div className="space-y-2">
                  {rca.evidence.map((ev, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-zinc-300 font-mono">
                      <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5" />
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Remediation Action */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-300 font-bold">
                    Suggested Automated Remediation
                  </span>
                  <p className="text-xs sm:text-sm font-mono text-white font-medium">
                    {rca.recommendedRemediation}
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/remediation')}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="shrink-0 text-xs font-mono"
                >
                  ROLLBACK DEPLOYMENT
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Anomaly Detection */}
      {activeTab === 'anomalies' && (
        <Card noPadding>
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-black">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-white" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                Detected Telemetry Anomalies ({anomalies.length} Signals)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              Evaluated via Isolation Forest &amp; LSTM Autoencoders
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
                  <th className="py-3 px-4 font-semibold uppercase">Anomaly Title</th>
                  <th className="py-3 px-4 font-semibold uppercase">Target Service</th>
                  <th className="py-3 px-4 font-semibold uppercase">Severity</th>
                  <th className="py-3 px-4 font-semibold uppercase">Expected vs Actual</th>
                  <th className="py-3 px-4 font-semibold uppercase">Deviation</th>
                  <th className="py-3 px-4 font-semibold uppercase">Confidence</th>
                  <th className="py-3 px-4 font-semibold uppercase">Detected</th>
                  <th className="py-3 px-4 font-semibold uppercase text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {anomalies.map((anom) => (
                  <tr key={anom.id} className="hover:bg-zinc-900/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{anom.title}</td>
                    <td className="py-3 px-4 text-zinc-300 font-medium">{anom.service}</td>
                    <td className="py-3 px-4">
                      <Badge variant={anom.severity === 'critical' ? 'critical' : 'warning'}>
                        {anom.severity.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {anom.expectedValue}{anom.unit} &rarr; <span className="font-bold text-white">{anom.actualValue}{anom.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-white font-bold">
                      +{anom.deviationPercent}%
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-white font-semibold">{anom.confidenceScore}%</span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{anom.timestamp}</td>
                    <td className="py-3 px-4 text-right">
                      <StatusPill status={anom.status} className="text-[10px]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: Predictive Analytics */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {predictions.map((pred) => {
              const isSelected = selectedPrediction?.id === pred.id;
              const isCrit = pred.riskLevel === 'critical';

              return (
                <div
                  key={pred.id}
                  onClick={() => setSelectedPrediction(pred)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer font-mono select-none ${
                    isSelected
                      ? 'bg-zinc-900 border-white shadow-glow-white'
                      : 'bg-[#09090B] border-zinc-800 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={isCrit ? 'critical' : 'warning'}>
                      {pred.metric} FORECAST
                    </Badge>
                    <span className="text-[10px] text-zinc-400">{pred.targetService}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1 line-clamp-1">{pred.title}</h4>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {pred.summary}
                  </p>
                  {pred.timeToExhaustion && (
                    <div className="mt-3 pt-2 border-t border-zinc-800 text-[10px] text-zinc-200 font-semibold">
                      {pred.timeToExhaustion}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Forecasting Chart with Confidence Bounds (Strictly Monochrome) */}
          {selectedPrediction && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>
                    <TrendingUp className="w-4 h-4 text-white" />
                    {selectedPrediction.title}
                  </CardTitle>
                  <CardDescription>
                    Historical actuals, projected trajectory, and 95% Bayesian confidence intervals
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="critical">
                    PROJECTED PEAK: {selectedPrediction.projectedPeak}%
                  </Badge>
                </div>
              </CardHeader>

              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={selectedPrediction.dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                    <XAxis
                      dataKey="timestamp"
                      stroke="#52525B"
                      tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'monospace' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[50, 105]}
                      stroke="#52525B"
                      tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'monospace' }}
                      tickLine={false}
                      unit="%"
                    />
                    <Tooltip
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-black border border-zinc-700 p-3 rounded-xl text-xs font-mono shadow-xl">
                              <p className="text-zinc-400 mb-1 border-b border-zinc-800 pb-1">{label}</p>
                              {payload.map((p: any, i: number) => (
                                <div key={i} className="flex justify-between gap-4 py-0.5">
                                  <span className="text-zinc-300">{p.name}:</span>
                                  <span className="font-bold text-white">{p.value}%</span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }} />
                    {/* Confidence Band Area */}
                    <Area
                      type="monotone"
                      dataKey="upperBand"
                      name="Confidence Upper Bound"
                      stroke="none"
                      fill="#FFFFFF"
                      fillOpacity={0.1}
                    />
                    {/* Actual */}
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual Recorded"
                      stroke="#FFFFFF"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#FFFFFF' }}
                    />
                    {/* Predicted */}
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      name="AI Predicted Trajectory"
                      stroke="#71717A"
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      dot={{ r: 3, fill: '#A1A1AA' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 4: AI Recommendations */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: 'rec-01',
                title: 'Rollback payment-gateway to v2.4.0',
                service: 'payment-gateway',
                priority: 'P1 - High Urgency',
                expectedImpact: 'Eliminates PostgreSQL connection exhaustion, reduces HTTP 504 errors by 100%.',
                suggestedRemediation: 'Trigger automated blue/green rollback to previous stable digest sha256:49c18e.',
              },
              {
                id: 'rec-02',
                title: 'Scale Out payment-gateway Replica Set',
                service: 'payment-gateway',
                priority: 'P1 - High Urgency',
                expectedImpact: 'Increases processing capacity from 4 to 8 pods, mitigating thread queue blockage.',
                suggestedRemediation: 'Apply Kubernetes HorizontalPodAutoscaler minReplicas=8.',
              },
              {
                id: 'rec-03',
                title: 'Purge Stale Redis volatile-lru Cache',
                service: 'redis-cache',
                priority: 'P2 - Moderate',
                expectedImpact: 'Reclaims ~14GB of memory, dropping utilization below the 80% eviction threshold.',
                suggestedRemediation: 'Execute targeted non-blocking UNLINK on expired session keys.',
              },
              {
                id: 'rec-04',
                title: 'Restart BigData Spark Worker Node',
                service: 'spark-worker-bigdata-01',
                priority: 'P3 - Standard',
                expectedImpact: 'Clears lingering JVM OOM zombie workers and unlocks queued batch rollup jobs.',
                suggestedRemediation: 'Gracefully drain and restart systemd unit spark-worker.service.',
              },
            ].map((rec) => (
              <Card key={rec.id} className="flex flex-col justify-between space-y-4 border-zinc-800">
                <div className="space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <Badge variant={rec.priority.includes('P1') ? 'critical' : 'warning'}>
                      {rec.priority}
                    </Badge>
                    <span className="text-xs text-zinc-300 font-semibold">{rec.service}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    <strong className="text-white">Expected Impact:</strong> {rec.expectedImpact}
                  </p>
                  <p className="text-xs text-zinc-400 font-mono">
                    <strong className="text-zinc-300">Action:</strong> {rec.suggestedRemediation}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/remediation')}
                    icon={<Zap className="w-3.5 h-3.5" />}
                    className="text-xs font-mono"
                  >
                    CONFIRM &amp; EXECUTE
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
