import React, { useState, useEffect } from 'react';
import {
  FileSearch,
  Upload,
  Layers,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Activity,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { PacketDetailModal } from '../components/PacketDetailModal';
import { StatusBadge } from '../components/StatusBadge';
import { ApiService } from '../services/api';
import { CaptureAnalysisResult, ParsedPacket } from '../types';

export const PacketAnalyzerPage: React.FC = () => {
  const [analysis, setAnalysis] = useState<CaptureAnalysisResult | null>(null);
  const [selectedPacket, setSelectedPacket] = useState<ParsedPacket | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [samples, setSamples] = useState<Array<{ id: string; fileName: string; label: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Fetch pre-packaged educational captures
    ApiService.listSampleCaptures()
      .then((data) => setSamples(data))
      .catch((err) => console.error('Failed loading sample captures:', err));

    // Auto-load scenario-1-normal by default
    ApiService.analyzeSampleCapture('scenario-1-normal')
      .then((res) => setAnalysis(res))
      .catch(() => {});
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const result = await ApiService.uploadCapture(file);
      setAnalysis(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to analyze uploaded capture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLoadSample = async (sampleId: string) => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const result = await ApiService.analyzeSampleCapture(sampleId);
      setAnalysis(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load sample capture');
    } finally {
      setIsUploading(false);
    }
  };

  // Filter packets
  const filteredPackets = (analysis?.packets || []).filter((pkt) => {
    if (activeFilter !== 'ALL' && pkt.protocol.toUpperCase() !== activeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        pkt.sourceIp.toLowerCase().includes(q) ||
        pkt.destinationIp.toLowerCase().includes(q) ||
        pkt.summary.toLowerCase().includes(q) ||
        String(pkt.sourcePort || '').includes(q) ||
        String(pkt.destinationPort || '').includes(q)
      );
    }
    return true;
  });

  // Chart data
  const chartData = analysis
    ? Object.entries(analysis.protocolBreakdown).map(([name, count]) => ({
        name,
        count,
      }))
    : [];

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

  return (
    <div className="space-y-6">
      {/* Upload and Sample Selection Bar */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-purple-400" />
              Wireshark & TShark Packet Analyzer
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect raw PCAP/PCAPNG capture files. Analyze DNS transactions, TCP handshakes, resets, and ICMP routing signals.
            </p>
          </div>

          {/* Upload Button */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md shadow-purple-900/30 transition cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Parsing Frames...' : 'Upload PCAP / PCAPNG'}</span>
              <input
                type="file"
                accept=".pcap,.pcapng,.cap"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Educational Sample Captures Selector */}
        {samples.length > 0 && (
          <div className="pt-3 border-t border-slate-800">
            <span className="text-xs font-mono text-slate-400 block mb-2">
              OR SELECT PRE-PACKAGED EDUCATIONAL SCENARIO CAPTURE:
            </span>
            <div className="flex flex-wrap gap-2">
              {samples.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleLoadSample(s.id)}
                  disabled={isUploading}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition cursor-pointer ${
                    analysis?.fileName === s.fileName
                      ? 'bg-purple-950 text-purple-300 border-purple-700 font-semibold'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs font-mono">
            ⚠️ {errorMsg}
          </div>
        )}
      </div>

      {/* Analysis Telemetry Cards */}
      {analysis && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 block mb-1">Total Frames</span>
              <span className="text-2xl font-bold text-slate-100 font-mono">
                {analysis.totalPackets}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 block mb-1">Parser Used</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  {analysis.parserUsed}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 block mb-1">TCP Resets (RST)</span>
              <span
                className={`text-2xl font-bold font-mono ${
                  analysis.tcpSummary.resets > 0 ? 'text-rose-400' : 'text-slate-100'
                }`}
              >
                {analysis.tcpSummary.resets}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 block mb-1">ICMP Unreachable</span>
              <span
                className={`text-2xl font-bold font-mono ${
                  analysis.icmpSummary.unreachableCount > 0 ? 'text-rose-400' : 'text-slate-100'
                }`}
              >
                {analysis.icmpSummary.unreachableCount}
              </span>
            </div>
          </div>

          {/* Key Findings Card */}
          {analysis.keyFindings.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h3 className="text-xs font-mono font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
                Packet Evidence Highlights
              </h3>
              <ul className="space-y-1.5 text-xs font-mono text-slate-200">
                {analysis.keyFindings.map((finding, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-sky-400">►</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Protocol Distribution Chart */}
          {chartData.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Protocol Distribution in Capture
              </h3>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Protocol Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {['ALL', 'DNS', 'TCP', 'UDP', 'ICMP', 'HTTP', 'TLS'].map((proto) => (
                <button
                  key={proto}
                  onClick={() => setActiveFilter(proto)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                    activeFilter === proto
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/40'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {proto}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by IP, port, or summary..."
                className="w-full px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Wireshark-Style Packet Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900 text-slate-400">
                  <th className="py-2.5 px-3">No.</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Source IP</th>
                  <th className="py-2.5 px-3">Destination IP</th>
                  <th className="py-2.5 px-3">Protocol</th>
                  <th className="py-2.5 px-3">Length</th>
                  <th className="py-2.5 px-4">Frame Information / Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredPackets.map((pkt) => {
                  let protoBadgeClass = 'bg-slate-800 text-slate-300';
                  if (pkt.protocol === 'DNS') protoBadgeClass = 'bg-purple-950 text-purple-300 border border-purple-800';
                  else if (pkt.protocol === 'TCP') protoBadgeClass = 'bg-sky-950 text-sky-300 border border-sky-800';
                  else if (pkt.protocol === 'ICMP') protoBadgeClass = 'bg-amber-950 text-amber-300 border border-amber-800';
                  else if (pkt.protocol === 'HTTP') protoBadgeClass = 'bg-emerald-950 text-emerald-300 border border-emerald-800';

                  const isReset = pkt.tcpFlags?.rst;
                  const isUnreach = pkt.icmpDetails?.type === 3;

                  return (
                    <tr
                      key={pkt.frameNumber}
                      onClick={() => setSelectedPacket(pkt)}
                      className={`hover:bg-slate-850/70 transition cursor-pointer ${
                        isReset || isUnreach ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-400">{pkt.frameNumber}</td>
                      <td className="py-2.5 px-3 text-slate-400">{pkt.timestamp.toFixed(4)}s</td>
                      <td className="py-2.5 px-3 text-slate-300 font-semibold">{pkt.sourceIp}</td>
                      <td className="py-2.5 px-3 text-slate-300 font-semibold">{pkt.destinationIp}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${protoBadgeClass}`}>
                          {pkt.protocol}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{pkt.length} B</td>
                      <td className="py-2.5 px-4 text-slate-200 truncate max-w-lg">
                        {pkt.summary}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Packet Detail Inspector Modal */}
      <PacketDetailModal packet={selectedPacket} onClose={() => setSelectedPacket(null)} />
    </div>
  );
};
