import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Calculator,
  FileCode,
  Copy,
  Check,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Layers,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { ApiService } from '../services/api';
import { ComprehensiveDiagnosisReport, VlsmPlanResult } from '../types';

interface PacketTracerHubPageProps {
  onLabReportGenerated: (report: ComprehensiveDiagnosisReport) => void;
}

export const PacketTracerHubPage: React.FC<PacketTracerHubPageProps> = ({
  onLabReportGenerated,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'vlsm' | 'configs' | 'importer'>('vlsm');

  // VLSM Planner State
  const [baseNetwork, setBaseNetwork] = useState('192.168.10.0');
  const [baseCidr, setBaseCidr] = useState(24);
  const [requirements, setRequirements] = useState([
    { name: 'LAN A (Student PCs)', requiredHosts: 50 },
    { name: 'LAN B (Faculty)', requiredHosts: 25 },
    { name: 'Server Farm (DNS & Web)', requiredHosts: 10 },
    { name: 'WAN Link (R1-R2)', requiredHosts: 2 },
  ]);
  const [vlsmResult, setVlsmResult] = useState<VlsmPlanResult | null>(null);
  const [vlsmLoading, setVlsmLoading] = useState(false);

  // Cisco Configs State
  const [configList, setConfigList] = useState<Array<{ filename: string; title: string; linesCount: number; preview: string }>>([]);
  const [activeConfigFilename, setActiveConfigFilename] = useState<string>('R1-baseline.cfg');
  const [activeConfigContent, setActiveConfigContent] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Lab Evidence Importer State
  const [labTarget, setLabTarget] = useState('192.168.10.105');
  const [gatewayStatus, setGatewayStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [routingStatus, setRoutingStatus] = useState<'PASS' | 'FAIL'>('FAIL');
  const [tcpStatus, setTcpStatus] = useState<'PASS' | 'FAIL'>('FAIL');
  const [labNotes, setLabNotes] = useState('Tested in Cisco Packet Tracer 8.2 virtual lab. R1 missing route to Server Farm.');
  const [importing, setImporting] = useState(false);

  // Load VLSM and Configs on mount
  useEffect(() => {
    handleComputeVlsm();
    ApiService.listConfigs()
      .then((data) => {
        setConfigList(data);
        if (data.length > 0) {
          loadConfig(data[0].filename);
        }
      })
      .catch((err) => console.error('Failed to load configs:', err));
  }, []);

  const handleComputeVlsm = async () => {
    setVlsmLoading(true);
    try {
      const res = await ApiService.calculateVlsm({
        baseNetwork: baseNetwork.trim(),
        baseCidr: Number(baseCidr),
        requirements,
      });
      setVlsmResult(res);
    } catch (err: any) {
      alert(`VLSM calculation error: ${err.message}`);
    } finally {
      setVlsmLoading(false);
    }
  };

  const loadConfig = async (filename: string) => {
    setActiveConfigFilename(filename);
    try {
      const text = await ApiService.getConfigContent(filename);
      setActiveConfigContent(text);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(activeConfigContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addRequirement = () => {
    setRequirements([...requirements, { name: `Subnet ${requirements.length + 1}`, requiredHosts: 10 }]);
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const handleImportLabEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    try {
      const observations = [
        {
          testName: 'Gateway Ping (192.168.10.1)',
          stage: 'GATEWAY',
          status: gatewayStatus,
          details:
            gatewayStatus === 'PASS'
              ? 'Ping from PC1 to 192.168.10.1 succeeded (!!!).'
              : 'Ping from PC1 to 192.168.10.1 failed (.....).',
        },
        {
          testName: `Remote Ping (${labTarget})`,
          stage: 'ROUTING',
          status: routingStatus,
          details:
            routingStatus === 'PASS'
              ? `Ping from PC1 to ${labTarget} succeeded (!!!).`
              : `Ping from PC1 to ${labTarget} returned "Destination Net Unreachable" from R1.`,
        },
        {
          testName: 'Web Server HTTP Connection',
          stage: 'TRANSPORT',
          status: tcpStatus,
          details:
            tcpStatus === 'PASS'
              ? 'PC1 Web Browser successfully fetched index.html from server.'
              : 'PC1 Web Browser timed out trying to connect on port 80.',
        },
      ];

      const res = await ApiService.compareLabEvidence({
        target: labTarget,
        observations,
        notes: labNotes,
      });

      onLabReportGenerated(res.report);
      alert('Packet Tracer lab evidence successfully imported into diagnostic engine!');
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              Cisco Packet Tracer Lab & VLSM Hub
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Verify classless VLSM subnet boundaries, inspect Cisco IOS router configurations, and correlate documented Packet Tracer lab evidence.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSubTab('vlsm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                activeSubTab === 'vlsm'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              VLSM Calculator
            </button>
            <button
              onClick={() => setActiveSubTab('configs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                activeSubTab === 'configs'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Cisco IOS Configs
            </button>
            <button
              onClick={() => setActiveSubTab('importer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                activeSubTab === 'importer'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Import Lab Evidence
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tab 1: VLSM Calculator & Verifier */}
      {activeSubTab === 'vlsm' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-400" />
              Variable Length Subnet Masking (VLSM) Design Inputs
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Base Major IPv4 Address</label>
                <input
                  type="text"
                  value={baseNetwork}
                  onChange={(e) => setBaseNetwork(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Base CIDR Prefix (/n)</label>
                <input
                  type="number"
                  value={baseCidr}
                  onChange={(e) => setBaseCidr(parseInt(e.target.value, 10))}
                  min={8}
                  max={30}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Department Requirements */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">Department / Subnet Requirements:</span>
                <button
                  type="button"
                  onClick={addRequirement}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Subnet
                </button>
              </div>

              <div className="space-y-2">
                {requirements.map((req, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={req.name}
                      onChange={(e) => {
                        const next = [...requirements];
                        next[idx].name = e.target.value;
                        setRequirements(next);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
                      placeholder="Subnet Name"
                    />
                    <input
                      type="number"
                      value={req.requiredHosts}
                      onChange={(e) => {
                        const next = [...requirements];
                        next[idx].requiredHosts = parseInt(e.target.value, 10) || 1;
                        setRequirements(next);
                      }}
                      min={1}
                      className="w-32 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
                      placeholder="Hosts Needed"
                    />
                    {requirements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRequirement(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleComputeVlsm}
              disabled={vlsmLoading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              <Calculator className="w-4 h-4" />
              {vlsmLoading ? 'Computing...' : 'Recalculate & Verify Non-Overlapping Subnets'}
            </button>
          </div>

          {/* Results Table */}
          {vlsmResult && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Calculated VLSM Subnet Plan
                </h3>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {vlsmResult.hasOverlap ? '⚠️ Overlap Detected' : '✓ Zero Overlaps (Verified)'}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900 text-slate-400">
                      <th className="py-2.5 px-3">Subnet Name</th>
                      <th className="py-2.5 px-3">Network ID</th>
                      <th className="py-2.5 px-3">CIDR</th>
                      <th className="py-2.5 px-3">Subnet Mask</th>
                      <th className="py-2.5 px-3">First Usable</th>
                      <th className="py-2.5 px-3">Last Usable</th>
                      <th className="py-2.5 px-3">Broadcast</th>
                      <th className="py-2.5 px-3">Usable Hosts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {vlsmResult.subnets.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50 transition">
                        <td className="py-2.5 px-3 text-slate-100 font-semibold">{sub.name}</td>
                        <td className="py-2.5 px-3 text-sky-400">{sub.networkAddress}</td>
                        <td className="py-2.5 px-3 text-slate-300">/{sub.cidr}</td>
                        <td className="py-2.5 px-3 text-slate-300">{sub.subnetMask}</td>
                        <td className="py-2.5 px-3 text-emerald-400">{sub.firstUsableIp}</td>
                        <td className="py-2.5 px-3 text-emerald-400">{sub.lastUsableIp}</td>
                        <td className="py-2.5 px-3 text-purple-400">{sub.broadcastAddress}</td>
                        <td className="py-2.5 px-3 text-slate-100 font-bold">{sub.usableHosts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Cisco IOS Config Viewer */}
      {activeSubTab === 'configs' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-400 block px-1">SELECT ROUTER CONFIG:</span>
            {configList.map((cfg) => (
              <div
                key={cfg.filename}
                onClick={() => loadConfig(cfg.filename)}
                className={`p-3 rounded-xl border transition cursor-pointer text-xs font-mono ${
                  activeConfigFilename === cfg.filename
                    ? 'bg-slate-900 border-indigo-500 text-indigo-300 font-semibold shadow-md'
                    : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700'
                }`}
              >
                {cfg.title}
              </div>
            ))}
          </div>

          <div className="md:col-span-3 space-y-4">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-mono text-slate-200 font-bold flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  {activeConfigFilename}
                </span>
                <button
                  onClick={handleCopyConfig}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy IOS Config
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-slate-200 font-mono text-xs overflow-x-auto max-h-[500px]">
                {activeConfigContent || 'Loading Cisco configuration...'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Packet Tracer Lab Evidence Importer */}
      {activeSubTab === 'importer' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl max-w-2xl space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-400" />
              Import Cisco Packet Tracer CLI Evidence
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Input test findings recorded inside Cisco Packet Tracer simulation mode. Sourced results are tagged as <span className="text-indigo-400 font-mono font-bold">LAB_EVIDENCE</span> in the diagnostic engine.
            </p>
          </div>

          <form onSubmit={handleImportLabEvidence} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">Target Virtual IP</label>
              <input
                type="text"
                value={labTarget}
                onChange={(e) => setLabTarget(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Default Gateway Ping</label>
                <select
                  value={gatewayStatus}
                  onChange={(e) => setGatewayStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100"
                >
                  <option value="PASS">PASS (!!!)</option>
                  <option value="FAIL">FAIL (.....)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Destination Host Ping</label>
                <select
                  value={routingStatus}
                  onChange={(e) => setRoutingStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100"
                >
                  <option value="PASS">PASS (!!!)</option>
                  <option value="FAIL">FAIL (Net Unreachable)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">HTTP Browser Check</label>
                <select
                  value={tcpStatus}
                  onChange={(e) => setTcpStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100"
                >
                  <option value="PASS">PASS (HTTP 200)</option>
                  <option value="FAIL">FAIL (Timeout)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Packet Tracer Lab Notes</label>
              <textarea
                value={labNotes}
                onChange={(e) => setLabNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={importing}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {importing ? 'Importing Evidence...' : 'Submit Lab Evidence & Correlate Diagnosis'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
