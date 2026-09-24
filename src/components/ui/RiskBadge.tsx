import React from 'react';

export type RiskLevelType = 'LOW' | 'MEDIUM' | 'HIGH' | string;

interface RiskBadgeProps {
  level: RiskLevelType;
  showIcon?: boolean;
}

export default function RiskBadge({ level }: RiskBadgeProps) {
  const norm = (level || 'LOW').toUpperCase();

  let color = 'bg-zinc-800 text-zinc-300 border-zinc-700';

  if (norm === 'LOW') {
    color = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/50';
  } else if (norm === 'MEDIUM' || norm === 'MED') {
    color = 'bg-amber-950/70 text-amber-300 border-amber-800/50';
  } else if (norm === 'HIGH') {
    color = 'bg-rose-950/70 text-rose-300 border-rose-800/50';
  }

  return (
    <span className={`inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${color}`}>
      {norm} RISK
    </span>
  );
}
