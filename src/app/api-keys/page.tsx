'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import Link from 'next/link';
import { 
  Key, Plus, Copy, Check, Trash2, Shield, AlertCircle, 
  Lock, RefreshCw 
} from 'lucide-react';
import { fetchWithCache, getClientCachedData, invalidateClientCache } from '@/lib/client-cache';

export default function ApiKeysWorkspacePage() {
  const cached = getClientCachedData<any>('/api/api-keys');
  const [keys, setKeys] = useState<any[]>(() => cached?.api_keys || cached?.apiKeys || []);
  const [loading, setLoading] = useState(!cached);
  const [name, setName] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const data = await fetchWithCache<any>('/api/api-keys');
      if (data) {
        setKeys(data.api_keys || data.apiKeys || []);
      }
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedSecret(data.secret_key || data.secretKey || null);
        setName('');
        await loadKeys();
      }
    } catch (err) {
      console.error('Failed to create key:', err);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteKey(id: string) {
    if (!confirm('Are you sure you want to revoke this API key? Any active client using it will be blocked immediately.')) return;
    try {
      const res = await fetch(`/api/api-keys?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadKeys();
      }
    } catch (err) {
      console.error('Failed to delete key:', err);
    }
  }

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#09090b]">
        <Navbar />

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#09090b]">
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="border-b border-zinc-800 pb-4">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-zinc-400" />
                REST API Keys &amp; Access Tokens
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Programmatic Bearer tokens for server-to-server chat runtime, mobile SDKs, and headless storefronts.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 border-b border-zinc-800 pb-2 overflow-x-auto">
              <Link href="/settings" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                General
              </Link>
              <Link href="/billing" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                Billing &amp; Quotas
              </Link>
              <Link href="/analytics" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                Store Analytics
              </Link>
              <Link href="/api-keys" className="px-3 py-1 text-xs font-semibold rounded-lg bg-zinc-800 text-white whitespace-nowrap">
                API Keys
              </Link>
              <Link href="/settings/members" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                Team Members
              </Link>
              <Link href="/settings/security" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                Security &amp; RBAC
              </Link>
              <Link href="/settings/audit-logs" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                Audit Logs
              </Link>
            </div>

            {/* Created Key Banner */}
            {createdSecret && (
              <div className="bg-[#121215] border border-emerald-800 rounded-xl p-4 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Shield className="w-4 h-4" /> API Key Created Successfully
                </div>
                <p className="text-[11px] text-zinc-400">
                  Please copy this key now. You will not be able to view the full secret key again.
                </p>
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-2 font-mono text-xs">
                  <span className="text-emerald-300 select-all flex-1 truncate">{createdSecret}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdSecret);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    }}
                    className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs flex items-center gap-1 shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy Key'}
                  </button>
                </div>
              </div>
            )}

            {/* Generate Form */}
            <form onSubmit={handleCreateKey} className="bg-[#121215] border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" /> Generate New API Key
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  placeholder="Key name, e.g. Production iOS App, Shopify Webhook Connector..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!name.trim() || creating}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition shrink-0 disabled:opacity-50"
                >
                  {creating ? 'Generating...' : 'Create Key'}
                </button>
              </div>
            </form>

            {/* Existing Keys Table */}
            <div className="bg-[#121215] border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800 shadow-sm">
              <div className="px-4 py-3 bg-[#09090b] text-[11px] font-mono text-zinc-400 grid grid-cols-12 items-center">
                <span className="col-span-5 font-semibold">NAME / PREFIX</span>
                <span className="col-span-3 font-semibold">CREATED</span>
                <span className="col-span-2 font-semibold">LAST USED</span>
                <span className="col-span-2 text-right font-semibold">ACTIONS</span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-zinc-500 font-mono flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-600" />
                  <span>Loading API keys...</span>
                </div>
              ) : keys.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                  No active API keys found. Generate one above to connect headless storefronts.
                </div>
              ) : (
                keys.map((k) => {
                  const prefix = k.key_prefix || k.keyPrefix || 'ak_live_';
                  const dateCreated = k.created_at || k.createdAt || Date.now();
                  const lastUsed = k.last_used_at || k.lastUsedAt;

                  return (
                    <div key={k.id} className="px-4 py-3 grid grid-cols-12 items-center hover:bg-zinc-900/40 transition">
                      <div className="col-span-5 font-sans min-w-0">
                        <p className="font-semibold text-white text-xs truncate">{k.name}</p>
                        <p className="font-mono text-zinc-400 text-[11px] truncate">{prefix}••••••••••••</p>
                      </div>
                      <span className="col-span-3 text-zinc-400 text-[11px] font-mono">
                        {new Date(dateCreated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="col-span-2 text-zinc-400 text-[11px] font-mono">
                        {lastUsed ? new Date(lastUsed).toLocaleDateString('en-US') : 'Never'}
                      </span>
                      <div className="col-span-2 text-right">
                        <button
                          onClick={() => handleDeleteKey(k.id)}
                          className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                          title="Revoke Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}