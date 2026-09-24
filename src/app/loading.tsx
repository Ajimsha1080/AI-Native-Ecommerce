import React from 'react';

export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#09090b] text-zinc-400 text-xs font-mono">
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 bg-zinc-400 rounded-full animate-ping"></span>
        <span>Loading workspace data...</span>
      </div>
    </div>
  );
}
