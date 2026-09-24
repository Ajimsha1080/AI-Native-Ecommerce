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

  let colorClasses = 'bg-zinc-100 text-zinc-700 border-zinc-200';
  let dotColor = 'bg-zinc-400';

  if (isLive) {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (isAlert) {
    colorClasses = 'bg-rose-50 text-rose-800 border-rose-200';
    dotColor = 'bg-rose-500';
  } else if (isPaused) {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500';
  }

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-2 py-0.5 gap-1.5' 
    : 'text-[11px] px-2.5 py-0.5 gap-1.5';

  return (
    <span className={`inline-flex items-center font-mono font-semibold uppercase tracking-wider rounded-full border ${colorClasses} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${pulse || isLive ? 'animate-pulse' : ''}`} />
      {norm}
    </span>
  );
}
