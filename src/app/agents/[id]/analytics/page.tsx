'use client';
import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/layout/Navbar';
import StudioSidebar from '@/components/layout/StudioSidebar';
import { BarChart3, CheckCircle2, Clock, Cpu } from 'lucide-react';

export default function AgentAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const agentId = resolvedParams.id;
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {});
  }, [agentId]);

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans antialiased overflow-hidden selection:bg-zinc-700 selection:text-white">
      <StudioSidebar agentId={agentId} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Agent Analytics & Traces</h1>
              <p className="text-xs text-zinc-400 mt-1">Real-time latency breakdown, token consumption, and execution step traces.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800 space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Avg Response Latency</span>
                <p className="text-xl font-bold font-mono text-zinc-100">480ms</p>
                <p className="text-[10px] font-mono text-emerald-400">P95: 720ms</p>
              </div>
              <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800 space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Total Tokens Processed</span>
                <p className="text-xl font-bold font-mono text-zinc-100">124,500</p>
                <p className="text-[10px] font-mono text-zinc-500">Estimated cost: $0.24</p>
              </div>
              <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800 space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Tool Success Rate</span>
                <p className="text-xl font-bold font-mono text-emerald-400">96.4%</p>
                <p className="text-[10px] font-mono text-zinc-500">328 / 340 successful</p>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#121215] border border-zinc-800 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-200">Recent Execution Traces</h3>
              <div className="space-y-3">
                {(data?.traces || []).map((t: any) => (
                  <div key={t.id} className="p-3.5 rounded-lg bg-[#09090b] border border-zinc-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200 font-mono">{t.id}</span>
                      <span className="font-mono text-[10px] text-emerald-400">{t.latency_ms}ms • {t.tokens_used?.total} tokens</span>
                    </div>
                    <p className="text-zinc-300"><strong>Intent:</strong> {t.intent}</p>
                    <p className="text-zinc-400"><strong>Tools:</strong> {t.tool_executions?.map((x: any) => x.tool_name).join(', ') || 'None'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
