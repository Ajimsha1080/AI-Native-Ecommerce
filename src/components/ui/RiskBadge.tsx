import React from 'react';

export type RiskLevelType = 'LOW' | 'MEDIUM' | 'HIGH' | string;

interface RiskBadgeProps {
  level: RiskLevelType;
  showIcon?: boolean;
}

export default function RiskBadge({ level }: RiskBadgeProps) {
  const norm = (level || 'LOW').toUpperCase();

  let color = 'bg-zinc-100 text-zinc-700 border-zinc-200';

  if (norm === 'LOW') {
    color = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (norm === 'MEDIUM' || norm === 'MED') {
    color = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (norm === 'HIGH') {
    color = 'bg-rose-50 text-rose-800 border-rose-200';
  }

  return (
    <span className={`inline-flex items-center text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {norm} RISK
    </span>
  );
}
