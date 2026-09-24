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
      <body className="bg-[#f4f5f7] text-zinc-900 flex items-center justify-center min-h-screen p-6 font-sans antialiased selection:bg-zinc-200">
        <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-2xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-zinc-900">Critical System Error</h2>
          <p className="text-xs text-zinc-600 leading-relaxed">
            The platform encountered a fatal exception. Please refresh or contact platform support.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Recover Application
          </button>
        </div>
      </body>
    </html>
  );
}
