'use client';
import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/layout/Navbar';
import StudioSidebar from '@/components/layout/StudioSidebar';
import { Brain, Save, CheckCircle2 } from 'lucide-react';

export default function MemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const agentId = resolvedParams.id;
  const [retention, setRetention] = useState(30);

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans antialiased overflow-hidden selection:bg-zinc-700 selection:text-white">
      <StudioSidebar agentId={agentId} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Agent Memory & Retention</h1>
              <p className="text-xs text-zinc-400 mt-1">Configure session context persistence and customer preference learning.</p>
            </div>

            <div className="p-6 rounded-xl bg-[#121215] border border-zinc-800 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div>
                  <h4 className="font-semibold text-xs text-zinc-200">Customer Size & Preference Memory</h4>
                  <p className="text-xs text-zinc-400">Remember preferred shoe sizes and colors across conversations.</p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-zinc-100 rounded bg-zinc-800 border-zinc-700" />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-medium text-zinc-300">Data Retention Period</span>
                  <span className="font-mono text-zinc-400">{retention} Days</span>
                </div>
                <input
                  type="range"
                  min="7"
                  max="180"
                  value={retention}
                  onChange={e => setRetention(Number(e.target.value))}
                  className="w-full accent-zinc-400"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
