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
    <div className="flex h-screen bg-[#f4f5f7] text-zinc-900 font-sans antialiased overflow-hidden selection:bg-zinc-200 selection:text-zinc-900">
      <StudioSidebar agentId={agentId} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Tools &amp; Permission Matrix</h1>
                <p className="text-xs text-zinc-500 mt-1">Configure capability toggles, risk tiers, and customer confirmation requirements.</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {saved ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Save className="h-3.5 w-3.5" />}
                <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Permissions'}</span>
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-4 shadow-2xs">
              <div className="divide-y divide-zinc-100">
                {tools.map((t) => (
                  <div key={t.id} className="py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xs text-zinc-900">{t.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold border ${
                          t.risk_level === 'LOW'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : t.risk_level === 'MEDIUM'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {t.risk_level} RISK
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">{t.description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={t.permission_mode}
                        onChange={e => changeMode(t.id, e.target.value)}
                        disabled={!t.is_enabled}
                        className="px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 disabled:opacity-40"
                      >
                        <option value="ALLOWED">Allowed Directly</option>
                        <option value="REQUIRES_CONFIRMATION">Customer Confirmation</option>
                        <option value="REQUIRES_APPROVAL">Human Staff Approval</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => toggleTool(t.id)}
                        className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          t.is_enabled ? 'bg-zinc-900' : 'bg-zinc-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            t.is_enabled ? 'translate-x-5' : 'translate-x-0'
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
