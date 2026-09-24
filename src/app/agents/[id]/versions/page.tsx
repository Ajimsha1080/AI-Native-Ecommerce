'use client';
import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/layout/Navbar';
import StudioSidebar from '@/components/layout/StudioSidebar';
import { History, Sparkles, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const agentId = resolvedParams.id;
  const [versions, setVersions] = useState<any[]>([]);
  const [summary, setSummary] = useState('');
  const [publishing, setPublishing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadVersions = () => {
    fetch(`/api/agents/${agentId}/versions`)
      .then(r => r.json())
      .then(d => setVersions(d.versions || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadVersions();
  }, [agentId]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);
    setError(null);

    try {
      const res = await fetch(`/api/agents/${agentId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PUBLISH', change_summary: summary })
      });
      if (!res.ok) throw new Error('Publish snapshot failed');
      setSummary('');
      loadVersions();
    } catch (err: any) {
      setError(err.message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const handleRollback = async (vId: string) => {
    if (!confirm('Rollback to this version snapshot?')) return;
    try {
      await fetch(`/api/agents/${agentId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ROLLBACK', version_id: vId })
      });
      loadVersions();
    } catch (err: any) {
      setError(err.message || 'Rollback failed');
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans antialiased overflow-hidden selection:bg-zinc-700 selection:text-white">
      <StudioSidebar agentId={agentId} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Version History & Immutability</h1>
              <p className="text-xs text-zinc-400 mt-1">Snapshot and publish immutable versions with instant zero-downtime rollbacks.</p>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Publish Form */}
            <form onSubmit={handlePublish} className="p-6 rounded-xl bg-[#121215] border border-zinc-800 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-zinc-400" />
              <span>Publish Next Production Version</span>
            </h3>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Changelog & Summary of Changes</label>
              <input
                type="text"
                required
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="e.g. Updated return policy chunks and enabled coupon validation tool"
                className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <button
              type="submit"
              disabled={publishing}
              className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-lg transition flex items-center gap-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{publishing ? 'Publishing Snapshot...' : 'Publish Version'}</span>
            </button>
          </form>

          {/* Versions Timeline */}
          <div className="space-y-3">
            {versions.map((v) => (
              <div key={v.id} className="p-4 rounded-xl bg-[#121215] border border-zinc-800 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-zinc-100 font-mono">{v.version_number}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 text-[10px] font-mono border border-emerald-800/50">
                      {v.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300">{v.change_summary}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Published on {formatDate(v.created_at)}</p>
                </div>

                <button
                  onClick={() => handleRollback(v.id)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Rollback</span>
                </button>
              </div>
            ))}
          </div>
          </div>
        </main>
      </div>
    </div>
  );
}
