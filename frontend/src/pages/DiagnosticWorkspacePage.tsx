import React, { useState } from 'react';
import {
  Terminal,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Download,
  ShieldAlert,
  Server,
  Layers,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { ApiService } from '../services/api';
import { ComprehensiveDiagnosisReport } from '../types';

interface DiagnosticWorkspacePageProps {
  latestReport: ComprehensiveDiagnosisReport | null;
  onRunSuccess: (report: ComprehensiveDiagnosisReport) => void;
}

export const DiagnosticWorkspacePage: React.FC<DiagnosticWorkspacePageProps> = ({
  latestReport,
  onRunSuccess,
}) => {
  const [target, setTarget] = useState('google.com');
  const [testType, setTestType] = useState('COMPREHENSIVE');
  const [customDnsServer, setCustomDnsServer] = useState('');
  const [tcpPort, setTcpPort] = useState(80);
  const [runTraceroute, setRunTraceroute] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;

    setIsRunning(true);
    setErrorMsg(null);

    try {
      const report = await ApiService.runDiagnostics({
        target: target.trim(),
        testType,
        customDnsServer: customDnsServer.trim() || undefined,
        tcpPort: Number(tcpPort) || 80,
        runTraceroute,
      });
      onRunSuccess(report);
    } catch (err: any) {
      setErrorMsg(err.message || 'Diagnostic execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!latestReport) return;
    try {
      await ApiService.exportReport(latestReport.id, format);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header & Controls Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-sky-400" />
              Real Network Diagnostic Workspace
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute live, non-destructive network telemetry tests across local NIC, Gateway, DNS, IP routing, and TCP sockets.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-sky-950 text-sky-300 border border-sky-800">
              MODE: LIVE OS TEST
            </span>
          </div>
        </div>

        <form onSubmit={handleRun} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Target Input */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Target Hostname or IPv4 Address *
              </label>
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g. google.com, cloudflare.com, 8.8.8.8"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs sm:text-sm focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            {/* Test Profile */}
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Test Profile</label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs sm:text-sm focus:outline-none focus:border-sky-500"
              >
                <option value="COMPREHENSIVE">Comprehensive (All Layers)</option>
                <option value="QUICK">Quick (Fast Triage)</option>
                <option value="DNS_ONLY">DNS Only (Name Resolution)</option>
                <option value="TCP_PORT_ONLY">TCP Port Only (Transport)</option>
                <option value="GATEWAY_ONLY">Gateway Only (Local LAN)</option>
                <option value="TRACEROUTE_ONLY">Traceroute Only (Hop Path)</option>
              </select>
            </div>

            {/* TCP Port */}
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">TCP Target Port</label>
              <input
                type="number"
                value={tcpPort}
                onChange={(e) => setTcpPort(parseInt(e.target.value, 10))}
                min={1}
                max={65535}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs sm:text-sm focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Optional Custom DNS */}
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Custom DNS Server (Optional)
              </label>
              <input
                type="text"
                value={customDnsServer}
                onChange={(e) => setCustomDnsServer(e.target.value)}
                placeholder="e.g. 8.8.8.8, 1.1.1.1"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs sm:text-sm focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Traceroute Toggle */}
            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300">
                <input
                  type="checkbox"
                  checked={runTraceroute}
                  onChange={(e) => setRunTraceroute(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0"
                />
                Include Traceroute (Path hops)
              </label>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs font-mono">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400 font-mono">
              🔒 Safe execution: Arguments validated against shell injection. No raw shell subprocesses invoked.
            </span>
            <button
              type="submit"
              disabled={isRunning}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-sky-900/30 transition cursor-pointer disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Running Active Telemetry...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Execute Safe Diagnostics
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Comprehensive Diagnostic Report Card */}
      {latestReport && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6 animate-fade-in">
          {/* Headline Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">TARGET:</span>
                <span className="text-base font-bold text-slate-100 font-mono">{latestReport.target}</span>
                <StatusBadge status={latestReport.mode} size="sm" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-100 mt-1">
                {latestReport.primaryHeadline}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={latestReport.overallStatus} size="lg" />
              {/* Export Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => handleExport('json')}
                  className="px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-white rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                  title="Export JSON Report"
                >
                  <Download className="w-3 h-3" /> JSON
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-white rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                  title="Export CSV Report"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
              </div>
            </div>
          </div>

          {/* Root Cause & Failure Point Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 block mb-1">
                TECHNICAL ROOT CAUSE ANALYSIS
              </span>
              <p className="text-sm text-slate-200 leading-relaxed font-sans">
                {latestReport.technicalRootCause}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-mono text-slate-400 block">ISOLATED FAILURE STAGE</span>
              <p className="text-sm font-mono font-bold text-rose-300">
                {latestReport.mostLikelyFailurePoint.replace(/_/g, ' ')}
              </p>
              <div className="pt-2 border-t border-slate-800 text-xs font-mono text-slate-400">
                Confidence: <span className="text-slate-100 font-semibold">{latestReport.confidence}</span>
              </div>
            </div>
          </div>

          {/* Layer-by-Layer Observations Table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              Observed Test Evidence by Stage
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 font-mono text-slate-400">
                    <th className="py-2.5 px-4">Stage</th>
                    <th className="py-2.5 px-4">Test Name</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Metric / Duration</th>
                    <th className="py-2.5 px-4">Observed Telemetry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {latestReport.observations.map((obs, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40 transition">
                      <td className="py-2.5 px-4 text-slate-400">{obs.stage}</td>
                      <td className="py-2.5 px-4 text-slate-200 font-semibold">{obs.testName}</td>
                      <td className="py-2.5 px-4">
                        <StatusBadge status={obs.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-4 text-emerald-400 font-semibold">
                        {obs.metric || 'N/A'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 font-sans max-w-md">
                        {obs.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alternative Explanations & Actionable Remediation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {latestReport.alternativeExplanations.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="text-xs font-mono font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Alternative Explanations & Caveats
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {latestReport.alternativeExplanations.map((alt, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{alt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {latestReport.recommendedSteps.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="text-xs font-mono font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Recommended Troubleshooting Steps
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {latestReport.recommendedSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Diagnostic Limitations Notice */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono">
            ℹ️ {latestReport.limitationsStatement}
          </div>
        </div>
      )}
    </div>
  );
};
