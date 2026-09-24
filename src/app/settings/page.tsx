'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { 
  Settings, Users, Shield, FileText, Save, CheckCircle2, RefreshCw 
} from 'lucide-react';
import Link from 'next/link';
import { fetchWithCache, getClientCachedData, setClientCachedData } from '@/lib/client-cache';

export default function SettingsWorkspacePage() {
  const cachedSettings = getClientCachedData('/api/settings');
  const [workspaceName, setWorkspaceName] = useState(() => cachedSettings?.workspace?.name || 'Acme Corp E-Commerce');
  const [defaultCurrency, setDefaultCurrency] = useState(() => cachedSettings?.workspace?.currency || 'USD');
  const [timezone, setTimezone] = useState(() => cachedSettings?.workspace?.timezone || 'America/New_York');
  const [loading, setLoading] = useState(!cachedSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await fetchWithCache('/api/settings');
        if (data?.workspace) {
          setWorkspaceName(data.workspace.name || 'Acme Corp E-Commerce');
          setDefaultCurrency(data.workspace.currency || 'USD');
          setTimezone(data.workspace.timezone || 'America/New_York');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workspaceName,
          currency: defaultCurrency,
          timezone: timezone
        })
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
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
                <Settings className="w-5 h-5 text-zinc-400" />
                Workspace Settings
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configure tenant metadata, team member roles, security policies, and audit logs.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 border-b border-zinc-800 pb-2 overflow-x-auto">
              <Link href="/settings" className="px-3 py-1 text-xs font-semibold rounded-lg bg-zinc-800 text-white whitespace-nowrap">
                General
              </Link>
              <Link href="/billing" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                Billing &amp; Quotas
              </Link>
              <Link href="/analytics" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                Store Analytics
              </Link>
              <Link href="/api-keys" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
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

            {saved && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-xs text-emerald-300 flex items-center gap-2 font-mono shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Workspace configuration saved and persisted successfully.
              </div>
            )}

            <form onSubmit={handleSave} className="bg-[#121215] border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Default Currency</label>
                  <select
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Store Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="America/Chicago">America/Chicago (CST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Europe/Paris">Europe/Paris (CET)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>

            {/* SuperAdmin Quick Access Card */}
            <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-zinc-300" />
                  <h3 className="text-xs font-bold text-white">SuperAdmin Platform Control</h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">ROOT ACCESS</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Manage multi-tenant organizations, vector index health, background cron runners, and platform metrics.
                </p>
              </div>
              <Link
                href="/admin"
                className="shrink-0 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold transition border border-zinc-700 flex items-center gap-2"
              >
                <span>Open SuperAdmin</span>
                <span className="font-mono text-zinc-400">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}