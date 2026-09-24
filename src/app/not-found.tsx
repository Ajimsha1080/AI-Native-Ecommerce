import React from 'react';
import Link from 'next/link';
import { Bot, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-[#121215] border border-zinc-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center mx-auto">
          <Bot className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-black text-white font-mono">404</h1>
          <h2 className="text-sm font-bold text-zinc-200">Resource Not Found</h2>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          The requested storefront, agent route, or workspace resource does not exist or has been removed.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" /> Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
