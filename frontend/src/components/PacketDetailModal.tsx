import React from 'react';
import { X, Layers, Cpu, Globe, Hash } from 'lucide-react';
import { ParsedPacket } from '../types';

interface PacketDetailModalProps {
  packet: ParsedPacket | null;
  onClose: () => void;
}

export const PacketDetailModal: React.FC<PacketDetailModalProps> = ({ packet, onClose }) => {
  if (!packet) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-sky-950/80 border border-sky-800 flex items-center justify-center text-sky-400 font-mono text-xs font-bold">
              #{packet.frameNumber}
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Frame #{packet.frameNumber} Details
                <span className="text-xs px-2 py-0.5 rounded bg-sky-900/40 text-sky-300 font-mono">
                  {packet.protocol}
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">{packet.timestampIso}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Protocol Layers Inspection */}
        <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs">
          {/* Layer 1 & Frame Overview */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300 font-semibold mb-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Frame / Physical Layer</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-400">
              <div>Frame Number: <span className="text-slate-200 font-bold">{packet.frameNumber}</span></div>
              <div>Wire Length: <span className="text-slate-200">{packet.length} bytes</span></div>
              <div>Timestamp: <span className="text-slate-200">{packet.timestamp.toFixed(4)}s</span></div>
            </div>
          </div>

          {/* Layer 3: Network Layer (IPv4 / IPv6) */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300 font-semibold mb-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Network Layer (Layer 3)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
              <div>Source IP: <span className="text-emerald-300 font-semibold">{packet.sourceIp}</span></div>
              <div>Destination IP: <span className="text-emerald-300 font-semibold">{packet.destinationIp}</span></div>
              <div>Protocol Identifier: <span className="text-slate-200">{packet.protocol}</span></div>
            </div>
          </div>

          {/* Layer 4: Transport Layer (TCP / UDP / ICMP) */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300 font-semibold mb-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>Transport Layer (Layer 4)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
              {packet.sourcePort !== undefined && (
                <div>Source Port: <span className="text-slate-200 font-semibold">{packet.sourcePort}</span></div>
              )}
              {packet.destinationPort !== undefined && (
                <div>Destination Port: <span className="text-slate-200 font-semibold">{packet.destinationPort}</span></div>
              )}
              {packet.tcpFlags && (
                <div className="sm:col-span-2 flex items-center gap-2 flex-wrap">
                  <span>TCP Flags:</span>
                  <span className="text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {packet.tcpFlags.raw}
                  </span>
                  {packet.tcpFlags.syn && <span className="bg-sky-950 text-sky-300 border border-sky-800 px-1.5 py-0.5 rounded">SYN</span>}
                  {packet.tcpFlags.ack && <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded">ACK</span>}
                  {packet.tcpFlags.rst && <span className="bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded">RST</span>}
                  {packet.tcpFlags.fin && <span className="bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded">FIN</span>}
                </div>
              )}
              {packet.icmpDetails && (
                <div className="sm:col-span-2">
                  <span>ICMP Message: </span>
                  <span className="text-amber-300 font-semibold">
                    Type {packet.icmpDetails.type}, Code {packet.icmpDetails.code} ({packet.icmpDetails.typeName})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Layer 7: Application Layer (DNS / HTTP / TLS) */}
          {packet.dnsDetails && (
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2 text-slate-300 font-semibold mb-2">
                <Hash className="w-4 h-4 text-purple-400" />
                <span>Application Layer (DNS)</span>
              </div>
              <div className="space-y-1.5 text-slate-400">
                <div>Type: <span className="text-slate-200">{packet.dnsDetails.isResponse ? 'DNS Response' : 'DNS Standard Query'}</span></div>
                {packet.dnsDetails.queryName && (
                  <div>Query Name: <span className="text-purple-300 font-semibold">{packet.dnsDetails.queryName}</span></div>
                )}
                {packet.dnsDetails.rcodeName && (
                  <div>
                    Response Code:{' '}
                    <span
                      className={`font-semibold ${
                        packet.dnsDetails.rcode === 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {packet.dnsDetails.rcodeName} (Code {packet.dnsDetails.rcode})
                    </span>
                  </div>
                )}
                {packet.dnsDetails.answersCount !== undefined && (
                  <div>Answers Count: <span className="text-slate-200">{packet.dnsDetails.answersCount}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Summary String */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <span className="text-slate-400 block text-[11px] mb-1 font-sans">Frame Summary:</span>
            <p className="text-sky-300">{packet.summary}</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
