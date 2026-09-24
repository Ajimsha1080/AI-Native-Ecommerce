import React from 'react';
import Link from 'next/link';
import { Bot, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f4f5f7] text-zinc-900 flex items-center justify-center p-6 font-sans antialiased selection:bg-zinc-200">
      <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center mx-auto shadow-2xs">
          <Bot className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-zinc-900 font-mono">404</h1>
          <h2 className="text-sm font-bold text-zinc-800">Resource Not Found</h2>
        </div>
        <p className="text-xs text-zinc-600 leading-relaxed">
          The requested storefront, agent route, or workspace resource does not exist or has been removed.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" /> Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
