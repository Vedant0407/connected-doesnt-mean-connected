import React from 'react';

interface StatusBadgeProps {
  status?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status = 'NOT_TESTED', size = 'md' }) => {
  const norm = status.toUpperCase().replace(/\s+/g, '_');

  let bg = 'bg-slate-800 text-slate-300 border-slate-700';
  let dot = 'bg-slate-400';

  if (norm === 'PASS' || norm === 'CONNECTED_AND_HEALTHY' || norm === 'ONLINE' || norm === 'SUCCESS') {
    bg = 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60';
    dot = 'bg-emerald-400';
  } else if (norm === 'FAIL' || norm === 'DISCONNECTED_OR_FAILED' || norm === 'OFFLINE') {
    bg = 'bg-rose-950/70 text-rose-300 border-rose-700/60';
    dot = 'bg-rose-500';
  } else if (norm === 'WARNING' || norm === 'CONNECTED_DEGRADED' || norm === 'DEGRADED') {
    bg = 'bg-amber-950/70 text-amber-300 border-amber-700/60';
    dot = 'bg-amber-400 animate-pulse';
  } else if (norm === 'INCONCLUSIVE') {
    bg = 'bg-purple-950/70 text-purple-300 border-purple-700/60';
    dot = 'bg-purple-400';
  } else if (norm === 'LIVE_TEST') {
    bg = 'bg-sky-950/70 text-sky-300 border-sky-700/60';
    dot = 'bg-sky-400';
  } else if (norm === 'SIMULATED') {
    bg = 'bg-teal-950/70 text-teal-300 border-teal-700/60';
    dot = 'bg-teal-400';
  } else if (norm === 'LAB_EVIDENCE') {
    bg = 'bg-indigo-950/70 text-indigo-300 border-indigo-700/60';
    dot = 'bg-indigo-400';
  } else if (norm === 'CAPTURE_ANALYSIS') {
    bg = 'bg-fuchsia-950/70 text-fuchsia-300 border-fuchsia-700/60';
    dot = 'bg-fuchsia-400';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5 font-medium',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono tracking-wide ${sizeClasses} ${bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status.replace(/_/g, ' ')}
    </span>
  );
};
