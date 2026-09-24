'use client';

import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/layout/Navbar';
import StudioSidebar from '@/components/layout/StudioSidebar';
import { Brain, Save, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export default function MemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const agentId = resolvedParams.id;
  const [retention, setRetention] = useState(30);
  const [preferenceMemory, setPreferenceMemory] = useState(true);
  const [sessionMemory, setSessionMemory] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/agents/${agentId}`)
      .then(r => r.json())
      .then(d => {
        if (d.config?.memory) {
          setRetention(d.config.memory.retention_days || 30);
          setPreferenceMemory(d.config.memory.customer_preferences ?? true);
          setSessionMemory(d.config.memory.session_memory ?? true);
        }
      })
      .catch(() => {});
  }, [agentId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            memory: {
              enabled: true,
              session_memory: sessionMemory,
              customer_preferences: preferenceMemory,
              retention_days: retention
            }
          }
        })
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f4f5f7] text-zinc-900 font-sans antialiased overflow-hidden selection:bg-zinc-200">
      <StudioSidebar agentId={agentId} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Agent Memory & Retention</h1>
                <p className="text-xs text-zinc-600 mt-1">Configure session context persistence and customer preference learning.</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {saved ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Save className="h-3.5 w-3.5" />}
                <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}</span>
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-6 shadow-2xs">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                <div>
                  <h4 className="font-bold text-xs text-zinc-900">Customer Size & Preference Memory</h4>
                  <p className="text-xs text-zinc-600 mt-0.5">Remember preferred shoe sizes, fit profile, and favorite colors across shopping sessions.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={preferenceMemory}
                  onChange={(e) => setPreferenceMemory(e.target.checked)}
                  className="h-4 w-4 accent-zinc-900 rounded cursor-pointer" 
                />
              </div>

              <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                <div>
                  <h4 className="font-bold text-xs text-zinc-900">Multi-Turn Session Context Persistence</h4>
                  <p className="text-xs text-zinc-600 mt-0.5">Maintain conversation history and active cart context across page refreshes.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={sessionMemory}
                  onChange={(e) => setSessionMemory(e.target.checked)}
                  className="h-4 w-4 accent-zinc-900 rounded cursor-pointer" 
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-800">GDPR Compliant Data Retention Window</span>
                  <span className="font-mono text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">{retention} Days</span>
                </div>
                <input
                  type="range"
                  min="7"
                  max="180"
                  value={retention}
                  onChange={e => setRetention(Number(e.target.value))}
                  className="w-full accent-zinc-900 cursor-pointer"
                />
                <p className="text-[11px] text-zinc-500">
                  After {retention} days of inactivity, anonymous session embeddings and chat history are securely purged.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
