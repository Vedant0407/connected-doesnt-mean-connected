import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Download,
  Terminal,
  FileSearch,
  BookOpen,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import {
  ComprehensiveDiagnosisReport,
  StoredDiagnosticRecord,
  ToolsStatus,
} from '../types';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
  latestReport: ComprehensiveDiagnosisReport | null;
  history: StoredDiagnosticRecord[];
  toolsStatus: ToolsStatus | null;
  onQuickRun: (target: string) => void;
  isLoading: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  latestReport,
  history,
  toolsStatus,
  onQuickRun,
  isLoading,
}) => {
  const [targetInput, setTargetInput] = useState('google.com');

  const totalRuns = history.length;
  const healthyRuns = history.filter((h) => h.overallStatus === 'CONNECTED_AND_HEALTHY').length;
  const failedRuns = history.filter((h) => h.overallStatus === 'DISCONNECTED_OR_FAILED').length;
  const degradedRuns = history.filter((h) => h.overallStatus === 'CONNECTED_DEGRADED').length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetInput.trim()) {
      onQuickRun(targetInput.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-800 text-sky-400 text-xs font-mono mb-4">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            Computer Networks Capstone Diagnostic Platform
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Connected Doesn't Mean Connected
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
            An evidence-based diagnostic simulator and deep-packet inspection platform. Investigates why Layer 1/2 physical links ("Connected") often fail to deliver Layer 3 routing, Layer 4 transport, or Layer 7 DNS/HTTP application services.
          </p>

          {/* Quick Target Runner */}
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl">
            <div className="relative flex-1">
              <input
                type="text"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="Enter domain or IP (e.g. google.com, 8.8.8.8)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-sky-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-900/30 transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Terminal className="w-4 h-4" />
                  Run Live Triage
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-slate-400 block mb-1">Total Audits</span>
            <span className="text-2xl font-bold text-slate-100 font-mono">{totalRuns}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <Activity className="w-5 h-5 text-sky-400" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-emerald-400 block mb-1">Healthy / Pass</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono">{healthyRuns}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-900 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-rose-400 block mb-1">Confirmed Failures</span>
            <span className="text-2xl font-bold text-rose-400 font-mono">{failedRuns}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-900 flex items-center justify-center text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-amber-400 block mb-1">Degraded / Warning</span>
            <span className="text-2xl font-bold text-amber-400 font-mono">{degradedRuns}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-900 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tool Detection Notice */}
      {toolsStatus && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-slate-200">
                  Packet Engine Active:
                </span>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded ${
                    toolsStatus.tshark.isAvailable
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {toolsStatus.tshark.backendParser}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{toolsStatus.tshark.diagnosticNotice}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('analyzer')}
            className="text-xs text-sky-400 hover:text-sky-300 font-mono flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            Open Packet Analyzer <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Latest Report Callout (if available) */}
      {latestReport && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-mono text-slate-400 block">LATEST DIAGNOSTIC RESULT</span>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mt-0.5">
                Target: {latestReport.target}
                <StatusBadge status={latestReport.mode} size="sm" />
              </h2>
            </div>
            <StatusBadge status={latestReport.overallStatus} size="lg" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-xs font-mono text-slate-400 block mb-1">PRIMARY DIAGNOSIS</span>
              <p className="text-sm font-semibold text-sky-300">{latestReport.primaryHeadline}</p>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {latestReport.technicalRootCause}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-xs font-mono text-slate-400 block mb-1">FAILURE ATTRIBUTION</span>
              <p className="text-sm font-mono font-semibold text-rose-300">
                {latestReport.mostLikelyFailurePoint.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Confidence Level: <span className="text-slate-200 font-semibold">{latestReport.confidence}</span>
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onNavigate('workspace')}
                  className="px-3 py-1.5 rounded-lg bg-sky-950 border border-sky-800 text-sky-300 text-xs font-medium hover:bg-sky-900/60 transition cursor-pointer"
                >
                  View Full Report
                </button>
                <button
                  onClick={() => onNavigate('topology')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
                >
                  Inspect Topology Flow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('topology')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-850 transition cursor-pointer group shadow-md"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 mb-3 group-hover:scale-105 transition">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-100 group-hover:text-sky-300 transition">
            Interactive Network Topology
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Trace end-to-end communication from Client PC through Gateways, Routers, DNS, and Target Service with animated packet flows.
          </p>
        </div>

        <div
          onClick={() => onNavigate('analyzer')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-850 transition cursor-pointer group shadow-md"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-105 transition">
            <FileSearch className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-100 group-hover:text-purple-300 transition">
            PCAP / PCAPNG Packet Analyzer
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Upload Wireshark captures or test scenario traces to inspect DNS queries, TCP resets, ICMP errors, and protocol breakdowns.
          </p>
        </div>

        <div
          onClick={() => onNavigate('lab')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition cursor-pointer group shadow-md"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-100 group-hover:text-emerald-300 transition">
            Packet Tracer & VLSM Planner
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Calculate and verify non-overlapping VLSM subnets, inspect Cisco IOS router configurations, and import academic lab evidence.
          </p>
        </div>
      </div>
    </div>
  );
};
