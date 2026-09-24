'use client';
import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/layout/Navbar';
import StudioSidebar from '@/components/layout/StudioSidebar';
import { Wrench, ShieldAlert, CheckCircle2, Save, Lock, AlertTriangle } from 'lucide-react';

export default function ToolsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const agentId = resolvedParams.id;
  const [tools, setTools] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/agents/${agentId}`)
      .then(r => r.json())
      .then(d => setTools(d.tools || []))
      .catch(() => {});
  }, [agentId]);

  const toggleTool = (toolId: string) => {
    setTools(prev => prev.map(t => t.id === toolId ? { ...t, is_enabled: !t.is_enabled } : t));
  };

  const changeMode = (toolId: string, mode: string) => {
    setTools(prev => prev.map(t => t.id === toolId ? { ...t, permission_mode: mode } : t));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const perms = tools.map(t => ({
        tool_id: t.id,
        is_enabled: t.is_enabled,
        permission_mode: t.permission_mode
      }));

      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_permissions: perms })
      });

      if (!res.ok) throw new Error('Failed to update tool permissions');

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans antialiased overflow-hidden selection:bg-zinc-700 selection:text-white">
      <StudioSidebar agentId={agentId} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Tools & Permission Matrix</h1>
                <p className="text-xs text-zinc-400 mt-1">Configure capability toggles, risk tiers, and customer confirmation requirements.</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-lg transition flex items-center gap-2 shadow"
              >
                {saved ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Save className="h-3.5 w-3.5" />}
                <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Permissions'}</span>
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

          <div className="p-6 rounded-xl bg-[#121215] border border-zinc-800 space-y-4">
            <div className="divide-y divide-zinc-800">
              {tools.map((t) => (
                <div key={t.id} className="py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-xs text-zinc-200">{t.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                        t.risk_level === 'LOW'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                          : t.risk_level === 'MEDIUM'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                          : 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                      }`}>
                        {t.risk_level} RISK
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">{t.description}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={t.permission_mode}
                      onChange={e => changeMode(t.id, e.target.value)}
                      disabled={!t.is_enabled}
                      className="px-3 py-1.5 bg-[#09090b] border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 disabled:opacity-40"
                    >
                      <option value="ALLOWED">Allowed Directly</option>
                      <option value="REQUIRES_CONFIRMATION">Customer Confirmation</option>
                      <option value="REQUIRES_APPROVAL">Human Staff Approval</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => toggleTool(t.id)}
                      className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        t.is_enabled ? 'bg-zinc-100' : 'bg-zinc-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${
                          t.is_enabled ? 'translate-x-5 bg-zinc-950' : 'translate-x-0 bg-zinc-400'
                        }`}
                      />
                    </button>
                  </div>
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
