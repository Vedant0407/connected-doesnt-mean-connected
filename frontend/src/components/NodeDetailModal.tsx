import React from 'react';
import { X, Network, CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { TopologyNodeData } from '../types';

interface NodeDetailModalProps {
  node: TopologyNodeData | null;
  onClose: () => void;
}

export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({ node, onClose }) => {
  if (!node) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'FAIL':
        return <XCircle className="w-5 h-5 text-rose-500" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      default:
        return <HelpCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Network className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">{node.label}</h3>
              <p className="text-xs text-slate-400 font-mono">{node.role}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2">
              {getStatusIcon(node.status)}
              <span className="text-xs font-medium text-slate-300">Operational Status</span>
            </div>
            <StatusBadge status={node.status} size="sm" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block mb-1">IP Address</span>
              <span className="text-slate-100 font-semibold">{node.ip || 'Unassigned / Dynamic'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block mb-1">Measured Latency</span>
              <span className="text-emerald-400 font-semibold">{node.latency || 'N/A'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-400 font-mono">Evidence Source:</span>
              <StatusBadge status={node.evidenceSource} size="sm" />
            </div>
            <p className="text-slate-300 leading-relaxed mt-2">{node.details || 'No active failure recorded at this stage.'}</p>
          </div>
        </div>

        {/* Footer */}
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
