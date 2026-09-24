import React from 'react';

export type AgentStatusType = 'LIVE' | 'DRAFT' | 'PAUSED' | 'ARCHIVED' | 'OPEN' | 'RESOLVED' | 'ESCALATED' | 'SUCCESS' | 'FAILED' | 'RUNNING' | string;

interface StatusBadgeProps {
  status: AgentStatusType;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export default function StatusBadge({ status, size = 'md', pulse }: StatusBadgeProps) {
  const norm = (status || 'DRAFT').toUpperCase();

  const isLive = norm === 'LIVE' || norm === 'RESOLVED' || norm === 'SUCCESS' || norm === 'ACTIVE';
  const isPaused = norm === 'PAUSED' || norm === 'DRAFT' || norm === 'RUNNING';
  const isAlert = norm === 'ESCALATED' || norm === 'FAILED';

  let colorClasses = 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60';
  let dotColor = 'bg-zinc-400';

  if (isLive) {
    colorClasses = 'bg-emerald-950/60 text-emerald-300 border-emerald-700/40';
    dotColor = 'bg-emerald-400';
  } else if (isAlert) {
    colorClasses = 'bg-rose-950/60 text-rose-300 border-rose-700/40';
    dotColor = 'bg-rose-400';
  } else if (isPaused) {
    colorClasses = 'bg-amber-950/60 text-amber-300 border-amber-700/40';
    dotColor = 'bg-amber-400';
  }

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-1.5 py-0.5 gap-1' 
    : 'text-[11px] px-2 py-0.5 gap-1.5';

  return (
    <span className={`inline-flex items-center font-mono font-semibold uppercase tracking-wider rounded-md border ${colorClasses} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${pulse || isLive ? 'animate-pulse' : ''}`} />
      {norm}
    </span>
  );
}
