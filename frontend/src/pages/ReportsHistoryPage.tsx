import React, { useState } from 'react';
import {
  History,
  Download,
  Trash2,
  GitCompare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  X,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { ApiService } from '../services/api';
import { ComprehensiveDiagnosisReport, StoredDiagnosticRecord } from '../types';

interface ReportsHistoryPageProps {
  history: StoredDiagnosticRecord[];
  onSelectReport: (report: ComprehensiveDiagnosisReport) => void;
  onRefreshHistory: () => void;
}

export const ReportsHistoryPage: React.FC<ReportsHistoryPageProps> = ({
  history,
  onSelectReport,
  onRefreshHistory,
}) => {
  const [selectedRun1, setSelectedRun1] = useState<string>('');
  const [selectedRun2, setSelectedRun2] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);
  const [comparing, setComparing] = useState(false);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this diagnostic report?')) return;
    try {
      await ApiService.deleteDiagnostic(id);
      onRefreshHistory();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleExport = async (id: string, format: 'json' | 'csv', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await ApiService.exportReport(id, format);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleCompare = async () => {
    if (!selectedRun1 || !selectedRun2 || selectedRun1 === selectedRun2) {
      alert('Please select two distinct runs to compare.');
      return;
    }

    setComparing(true);
    try {
      const res = await ApiService.compareRuns(selectedRun1, selectedRun2);
      setComparisonResult(res);
    } catch (err: any) {
      alert(`Comparison error: ${err.message}`);
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-sky-400" />
            Diagnostic Reports & Historical Diff
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Review past live triage audits and simulated lab runs. Compare two runs side-by-side or export JSON/CSV records.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          Stored Runs: <span className="text-slate-100 font-bold">{history.length}</span>
        </div>
      </div>

      {/* Comparison Launcher Card */}
      {history.length >= 2 && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3">
          <span className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-sky-400" />
            Compare Two Diagnostic Runs:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={selectedRun1}
              onChange={(e) => setSelectedRun1(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
            >
              <option value="">Select Run 1...</option>
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.target} ({new Date(h.timestamp).toLocaleTimeString()}) - {h.overallStatus}
                </option>
              ))}
            </select>

            <select
              value={selectedRun2}
              onChange={(e) => setSelectedRun2(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
            >
              <option value="">Select Run 2...</option>
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.target} ({new Date(h.timestamp).toLocaleTimeString()}) - {h.overallStatus}
                </option>
              ))}
            </select>

            <button
              onClick={handleCompare}
              disabled={comparing}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              <GitCompare className="w-3.5 h-3.5" />
              {comparing ? 'Comparing...' : 'Compare Runs'}
            </button>
          </div>
        </div>
      )}

      {/* Comparison Modal / Result Drawer */}
      {comparisonResult && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-sky-600/60 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-sky-400" />
              Diagnostic Diff: {comparisonResult.comparison.summary}
            </h3>
            <button
              onClick={() => setComparisonResult(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            {/* Run 1 Summary */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-slate-400 block font-sans font-semibold">RUN 1: {comparisonResult.run1.target}</span>
              <div>Status: <StatusBadge status={comparisonResult.run1.overallStatus} size="sm" /></div>
              <div>Failure Point: <span className="text-rose-400">{comparisonResult.run1.mostLikelyFailurePoint}</span></div>
              <div className="text-slate-300 font-sans text-[11px] pt-1">{comparisonResult.run1.primaryHeadline}</div>
            </div>

            {/* Run 2 Summary */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-slate-400 block font-sans font-semibold">RUN 2: {comparisonResult.run2.target}</span>
              <div>Status: <StatusBadge status={comparisonResult.run2.overallStatus} size="sm" /></div>
              <div>Failure Point: <span className="text-rose-400">{comparisonResult.run2.mostLikelyFailurePoint}</span></div>
              <div className="text-slate-300 font-sans text-[11px] pt-1">{comparisonResult.run2.primaryHeadline}</div>
            </div>
          </div>

          {comparisonResult.comparison.differences.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-amber-400 font-mono font-semibold block mb-1.5">Detected Variances:</span>
              <ul className="space-y-1 text-slate-300 font-mono">
                {comparisonResult.comparison.differences.map((diff: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-amber-400">Δ</span>
                    <span>{diff}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* History Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-slate-400">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Target Host / IP</th>
              <th className="py-3 px-4">Mode</th>
              <th className="py-3 px-4">Overall Status</th>
              <th className="py-3 px-4">Failure Point Attribution</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {history.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                  No diagnostic runs stored yet. Execute a test in the Diagnostic Workspace or simulate an Educational Scenario.
                </td>
              </tr>
            ) : (
              history.map((rec) => (
                <tr
                  key={rec.id}
                  onClick={() => onSelectReport(rec.report)}
                  className="hover:bg-slate-900/60 transition cursor-pointer"
                >
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {new Date(rec.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-slate-200 font-bold">{rec.target}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={rec.mode} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={rec.overallStatus} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-slate-300 truncate max-w-xs">
                    {rec.mostLikelyFailurePoint.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleExport(rec.id, 'json', e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        title="Download JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(rec.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Delete Report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
