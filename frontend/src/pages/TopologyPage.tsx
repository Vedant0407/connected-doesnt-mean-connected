import React, { useState } from 'react';
import {
  Laptop,
  Wifi,
  ShieldAlert,
  Server,
  Router as RouterIcon,
  Globe,
  Radio,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Play,
} from 'lucide-react';
import { NodeDetailModal } from '../components/NodeDetailModal';
import { StatusBadge } from '../components/StatusBadge';
import { ComprehensiveDiagnosisReport, TopologyNodeData } from '../types';

interface TopologyPageProps {
  latestReport: ComprehensiveDiagnosisReport | null;
  onRunTest: () => void;
  isRunning: boolean;
}

export const TopologyPage: React.FC<TopologyPageProps> = ({
  latestReport,
  onRunTest,
  isRunning,
}) => {
  const [selectedNode, setSelectedNode] = useState<TopologyNodeData | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Derive nodes from latest diagnostic report or baseline defaults
  const getFailurePoint = latestReport?.mostLikelyFailurePoint;
  const isHealthy = latestReport?.overallStatus === 'CONNECTED_AND_HEALTHY';

  const defaultNodes: TopologyNodeData[] = [
    {
      id: 'client',
      label: 'Client Device',
      role: 'Host Machine (Endpoint)',
      ip: '192.168.1.15',
      mac: '00:0C:29:11:22:33',
      status: getFailurePoint === 'PHYSICAL_OR_LOCAL_INTERFACE' ? 'FAIL' : 'SUCCESS',
      evidenceSource: latestReport ? latestReport.mode : 'SIMULATED',
      details:
        getFailurePoint === 'PHYSICAL_OR_LOCAL_INTERFACE'
          ? 'Local NIC is disconnected or self-assigned APIPA 169.254.x.x.'
          : 'Active network interface operational with valid IPv4 address.',
      latency: '<1ms',
    },
    {
      id: 'wifi',
      label: 'LAN / Wi-Fi Access',
      role: 'Layer 1/2 RF & Ethernet',
      status: getFailurePoint === 'PHYSICAL_OR_LOCAL_INTERFACE' ? 'FAIL' : 'SUCCESS',
      evidenceSource: latestReport ? latestReport.mode : 'SIMULATED',
      details: 'Physical link carrier signal detected. Framing verified.',
      latency: '1ms',
    },
    {
      id: 'auth',
      label: 'DHCP & Auth',
      role: '802.1X / DHCP Lease',
      status: getFailurePoint === 'PHYSICAL_OR_LOCAL_INTERFACE' ? 'FAIL' : 'SUCCESS',
      evidenceSource: latestReport ? latestReport.mode : 'SIMULATED',
      details: 'DHCP ACK received. Lease active with valid subnet mask and gateway.',
      latency: '2ms',
    },
    {
      id: 'switch',
      label: 'Access Switch',
      role: 'Layer 2 Ethernet Forwarding',
      status: getFailurePoint === 'PHYSICAL_OR_LOCAL_INTERFACE' ? 'FAIL' : 'SUCCESS',
      evidenceSource: latestReport ? latestReport.mode : 'SIMULATED',
      details: 'MAC address table learning and VLAN 10 frame forwarding normal.',
      latency: '<1ms',
    },
    {
      id: 'gateway',
      label: 'Default Gateway',
      role: 'Local Subnet Router (R1)',
      ip: '192.168.1.1',
      status:
        getFailurePoint === 'DEFAULT_GATEWAY'
          ? 'FAIL'
          : getFailurePoint === 'PHYSICAL_OR_LOCAL_INTERFACE'
          ? 'NEUTRAL'
          : 'SUCCESS',
      evidenceSource: latestReport ? latestReport.mode : 'SIMULATED',
      details:
        getFailurePoint === 'DEFAULT_GATEWAY'
          ? 'Default gateway unresponsive to ARP / ICMP Echo. Packets cannot leave local subnet.'
          : 'Default gateway responding to ICMP Echo within threshold.',
      latency: '1-3ms',
    },
    {
      id: 'routing',
      label: 'Transit & Routing',
      role: 'WAN Router / Next-Hop ISP',
      ip: '10.0.0.2',
      status:
        getFailurePoint === 'ROUTING_AND_TRANSIT'
          ? 'FAIL'
          : getFailurePoint === 'NETWORK_CONGESTION_PACKET_LOSS'
          ? 'WARNING'
          : getFailurePoint === 'DEFAULT_GATEWAY' || getFailurePoint === 'PHYSICAL_OR_LOCAL_INTERFACE'
          ? 'NEUTRAL'
          : 'SUCCESS',
      evidenceSource: latestReport ? latestReport.mode : 'SIMULATED',
      details:
        getFailurePoint === 'ROUTING_AND_TRANSIT'
          ? 'Routing blackhole or ICMP Destination Unreachable received at intermediate hop.'
          : getFailurePoint === 'NETWORK_CONGESTION_PACKET_LOSS'
          ? 'High latency jitter and packet drop detected along WAN transit.'
          : 'Traceroute hops traversed without routing loops or drops.',
      latency: '15-45ms',
    },
    {
      id: 'dns',
      label: 'DNS Server',
      role: 'Name Resolution (Port 53)',
      ip: '8.8.8.8',
      status:
        getFailurePoint === 'DNS_RESOLUTION'
          ? 'FAIL'
          : ['PHYSICAL_OR_LOCAL_INTERFACE', 'DEFAULT_GATEWAY', 'ROUTING_AND_TRANSIT'].includes(
              getFailurePoint || ''
            )
          ? 'NEUTRAL'
          : 'SUCCESS',
      evidenceSource: latestReport ? latestReport.mode : 'SIMULATED',
      details:
        getFailurePoint === 'DNS_RESOLUTION'
          ? 'DNS lookup failed (NXDOMAIN / timeout). Destination IP cannot be resolved.'
          : 'Domain name resolved to IPv4 addresses successfully.',
      latency: '12-25ms',
    },
    {
      id: 'service',
      label: 'Target Service',
      role: 'Application Daemon (TCP 80/443)',
      ip: latestReport ? latestReport.target : 'Destination Web Host',
      status:
        getFailurePoint === 'TARGET_SERVICE_PORT'
          ? 'FAIL'
          : !isHealthy && latestReport
          ? 'NEUTRAL'
          : 'SUCCESS',
      evidenceSource: latestReport ? latestReport.mode : 'SIMULATED',
      details:
        getFailurePoint === 'TARGET_SERVICE_PORT'
          ? 'TCP handshake rejected (RST) or timed out. Application daemon is offline or filtered.'
          : 'TCP connection established and application port responsive.',
      latency: '22ms',
    },
  ];

  const getNodeIcon = (id: string) => {
    switch (id) {
      case 'client':
        return <Laptop className="w-5 h-5 text-sky-400" />;
      case 'wifi':
        return <Wifi className="w-5 h-5 text-sky-400" />;
      case 'auth':
        return <ShieldAlert className="w-5 h-5 text-indigo-400" />;
      case 'switch':
        return <Radio className="w-5 h-5 text-sky-400" />;
      case 'gateway':
        return <RouterIcon className="w-5 h-5 text-emerald-400" />;
      case 'routing':
        return <Globe className="w-5 h-5 text-indigo-400" />;
      case 'dns':
        return <Server className="w-5 h-5 text-purple-400" />;
      case 'service':
        return <Server className="w-5 h-5 text-emerald-400" />;
      default:
        return <Server className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBorder = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'border-emerald-600/80 bg-emerald-950/30 text-emerald-300';
      case 'FAIL':
        return 'border-rose-600/90 bg-rose-950/40 text-rose-300 ring-2 ring-rose-500/30';
      case 'WARNING':
        return 'border-amber-600/80 bg-amber-950/30 text-amber-300 ring-2 ring-amber-500/20';
      default:
        return 'border-slate-800 bg-slate-900/60 text-slate-400 opacity-60';
    }
  };

  return (
    <div className="space-y-4">
      {/* Topology Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            Interactive Network Path Topology
            {latestReport && <StatusBadge status={latestReport.mode} size="sm" />}
          </h2>
          <p className="text-xs text-slate-400">
            Click any component node to inspect Layer 1-7 telemetry, IP/MAC configurations, and failure evidence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-1">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
              className="p-1.5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-400 px-2">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.3, z + 0.1))}
              className="p-1.5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 text-slate-400 hover:text-slate-200 transition cursor-pointer border-l border-slate-800"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onRunTest}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-md shadow-sky-900/30 transition cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running Live Test...' : 'Run Network Diagnostic'}
          </button>
        </div>
      </div>

      {/* Visual Canvas Container */}
      <div className="relative overflow-x-auto overflow-y-hidden rounded-2xl bg-slate-950 border border-slate-800 p-6 min-h-[480px] flex items-center justify-center shadow-inner">
        {/* Background Grid Accent */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        {/* Scalable Network Path */}
        <div
          className="relative z-10 flex items-center gap-3 sm:gap-4 py-12 transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {defaultNodes.map((node, index) => {
            const isLast = index === defaultNodes.length - 1;
            const isFailed = node.status === 'FAIL';
            const isWarning = node.status === 'WARNING';
            const isSuccess = node.status === 'SUCCESS';

            return (
              <React.Fragment key={node.id}>
                {/* Component Node Card */}
                <div
                  onClick={() => setSelectedNode(node)}
                  className={`w-36 sm:w-40 p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-lg hover:scale-105 ${getStatusBorder(
                    node.status
                  )}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-center">
                      {getNodeIcon(node.id)}
                    </div>
                    {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {isFailed && <XCircle className="w-4 h-4 text-rose-500 animate-bounce" />}
                    {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    {node.status === 'NEUTRAL' && <HelpCircle className="w-4 h-4 text-slate-500" />}
                  </div>

                  <div>
                    <h3 className="font-semibold text-xs text-slate-100 truncate">{node.label}</h3>
                    <p className="text-[10px] text-slate-400 truncate">{node.role}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400 truncate">{node.ip || 'Layer 2'}</span>
                    <span
                      className={
                        isSuccess
                          ? 'text-emerald-400'
                          : isFailed
                          ? 'text-rose-400'
                          : 'text-slate-500'
                      }
                    >
                      {node.status}
                    </span>
                  </div>
                </div>

                {/* Animated Connecting Edge with SVG Pulse */}
                {!isLast && (
                  <div className="relative w-8 sm:w-12 flex items-center justify-center">
                    <div
                      className={`h-1 w-full rounded-full transition-all ${
                        isSuccess
                          ? 'bg-emerald-600/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          : isFailed
                          ? 'bg-rose-900 border-t-2 border-dashed border-rose-500'
                          : isWarning
                          ? 'bg-amber-600/80 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                          : 'bg-slate-800'
                      }`}
                    />
                    {/* Animated Packet Pulse */}
                    {(isRunning || isSuccess) && (
                      <div className="absolute w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8] animate-ping" />
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Legend & Explanation */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4 flex-wrap font-mono">
          <span className="text-slate-400">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Operational / Pass</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-300">Failure Point (Packet Dropped)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-300">Degraded / High Latency</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
            <span className="text-slate-400">Unreached / Bypassed</span>
          </div>
        </div>

        <div className="text-slate-400 text-[11px] font-sans">
          💡 Packet flow halts at the evidenced failure point to explain why physical connection ≠ end-to-end service.
        </div>
      </div>

      {/* Node Details Modal */}
      <NodeDetailModal node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
};
