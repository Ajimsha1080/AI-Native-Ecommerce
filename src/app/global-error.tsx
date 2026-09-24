'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-[#09090b] text-zinc-100 flex items-center justify-center min-h-screen p-6 font-sans">
        <div className="max-w-md w-full bg-[#121215] border border-zinc-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">Critical System Error</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The platform encountered a fatal exception. Please refresh or contact platform support.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold transition inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Recover Application
          </button>
        </div>
      </body>
    </html>
  );
}
