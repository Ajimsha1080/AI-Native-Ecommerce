'use client';

import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/layout/Navbar';
import StudioSidebar from '@/components/layout/StudioSidebar';
import { ShieldAlert, Plus, CheckCircle2, ShieldCheck, AlertCircle, Lock, Shield } from 'lucide-react';

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
    <div className="flex h-screen bg-[#f4f5f7] text-zinc-900 font-sans antialiased overflow-hidden selection:bg-zinc-200">
      <StudioSidebar agentId={agentId} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Business Rules & Guardrail Policies</h1>
                <p className="text-xs text-zinc-600 mt-1">Enforce deterministic business guardrails outside the LLM reasoning boundary.</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold shadow-2xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Deterministic Guardrails Active</span>
              </div>
            </div>

            <div className="space-y-3.5">
              {policies.map((p) => (
                <div key={p.id} className="p-5 rounded-2xl bg-white border border-zinc-200 flex items-start justify-between gap-4 shadow-2xs hover:border-zinc-300 transition">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <h3 className="font-bold text-xs text-zinc-900">{p.title}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-mono text-[10px] font-semibold">
                        {p.type}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">{p.description}</p>
                    <p className="text-[11px] font-mono text-zinc-500">
                      Condition: <code className="text-zinc-800 bg-zinc-100 px-1.5 py-0.5 rounded">{p.condition}</code>
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-700 font-bold whitespace-nowrap shadow-2xs">
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
