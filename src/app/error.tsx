'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-zinc-900 flex items-center justify-center p-6 font-sans antialiased selection:bg-zinc-200">
      <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-zinc-900">Something went wrong</h2>
        <p className="text-xs text-zinc-600 leading-relaxed">
          {error.message || 'An unexpected application error occurred while processing your request.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try Again
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-800 hover:bg-zinc-200 text-xs font-semibold border border-zinc-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
