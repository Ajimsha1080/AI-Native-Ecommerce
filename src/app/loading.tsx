import React from 'react';

export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#f4f5f7] text-zinc-600 text-xs font-mono">
      <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-zinc-200 shadow-2xs">
        <span className="w-2.5 h-2.5 bg-zinc-900 rounded-full animate-ping"></span>
        <span className="font-sans font-semibold text-zinc-800">Loading workspace data...</span>
      </div>
    </div>
  );
}
