'use client';
import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/layout/Navbar';
import StudioSidebar from '@/components/layout/StudioSidebar';
import { ShieldAlert, Plus, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function RulesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const agentId = resolvedParams.id;
  const [policies, setPolicies] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/agents/${agentId}`)
      .then(r => r.json())
      .then(d => setPolicies(d.policies || []))
      .catch(() => {});
  }, [agentId]);

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans antialiased overflow-hidden selection:bg-zinc-700 selection:text-white">
      <StudioSidebar agentId={agentId} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Business Rules & Guardrail Policies</h1>
              <p className="text-xs text-zinc-400 mt-1">Enforce deterministic business guardrails outside the LLM reasoning boundary.</p>
            </div>

            <div className="space-y-4">
              {policies.map((p) => (
                <div key={p.id} className="p-5 rounded-xl bg-[#121215] border border-zinc-800 flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <h3 className="font-semibold text-xs text-zinc-200">{p.title}</h3>
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                        {p.type}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">{p.description}</p>
                    <p className="text-[11px] font-mono text-zinc-500">Condition: <code className="text-zinc-300">{p.condition}</code></p>
                  </div>

                  <span className="px-2.5 py-1 rounded bg-[#09090b] border border-zinc-800 text-xs font-mono text-emerald-400 font-semibold">
                    {p.enforcement}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
