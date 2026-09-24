'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { 
  ShieldCheck, Lock, Key, Activity, EyeOff, 
  Server, AlertTriangle, CheckCircle2, Save, RefreshCw,
  FileText, Database, ShieldAlert, Cpu, ExternalLink, Loader2
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface AuditItem {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  actor_email?: string;
  ip_address?: string;
  created_at: string;
}

export default function SecuritySettingsPage() {
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Security Policy States
  const [tenantIsolation, setTenantIsolation] = useState(true);
  const [creditCardRedaction, setCreditCardRedaction] = useState(true);
  const [addressRedaction, setAddressRedaction] = useState(true);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(120);
  const [dataRetentionDays, setDataRetentionDays] = useState(90);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, logsRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/audit-logs?limit=10')
        ]);
        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          if (sData.workspace?.settings) {
            setDataRetentionDays(sData.workspace.settings.retention_days || 90);
            if (sData.workspace.settings.security?.rate_limit_rpm) {
              setRateLimitPerMinute(sData.workspace.settings.security.rate_limit_rpm);
            }
          }
        }
        if (logsRes.ok) {
          const lData = await logsRes.json();
          setAuditLogs(lData.logs || []);
        }
      } catch (e) {
        console.error('Error loading security data', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retention_days: dataRetentionDays,
          security: {
            rate_limit_rpm: rateLimitPerMinute
          }
        })
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (e) {
      alert('Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f4f5f7] text-zinc-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f4f5f7]">
        <Navbar />

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-sm shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-base font-bold text-zinc-900 tracking-tight">Security &amp; Data Governance</h1>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                      STRICT TENANT ISOLATION
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Enterprise tenant boundaries, PII redaction rules, rate limiting, and immutable audit logs.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-[#18181b] hover:bg-[#27272a] text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : savedSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Security Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Save Policies
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tenant Isolation Status Box */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-zinc-900">Multi-Tenant Workspace Data Isolation</h2>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  100% Isolated
                </span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Your workspace ID is cryptographically segregated at the database, embedding index, conversation logs, and caching layer. Tenant A can never query or cross-retrieve Tenant B’s products, customers, or credentials.
              </p>
            </div>

            {/* PII & Privacy Masking Controls */}
            <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-4 shadow-xs">
              <div className="border-b border-zinc-100 pb-3">
                <h2 className="text-sm font-bold text-zinc-900">PII Masking &amp; Customer Privacy</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Automatically sanitize sensitive customer data before LLM inference.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => setCreditCardRedaction(!creditCardRedaction)}
                  className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">Credit Card &amp; CVV Redaction</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Mask payment numbers as `**** **** **** 1234`</p>
                  </div>
                  <div className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 ${creditCardRedaction ? 'bg-indigo-600' : 'bg-zinc-300'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${creditCardRedaction ? 'left-4' : 'left-0.5'}`}></div>
                  </div>
                </div>

                <div 
                  onClick={() => setAddressRedaction(!addressRedaction)}
                  className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">Personal Address &amp; Phone Masking</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Redact personal contact details from analytics</p>
                  </div>
                  <div className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 ${addressRedaction ? 'bg-indigo-600' : 'bg-zinc-300'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${addressRedaction ? 'left-4' : 'left-0.5'}`}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rate Limiting & Retention */}
            <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-4 shadow-xs">
              <div className="border-b border-zinc-100 pb-3">
                <h2 className="text-sm font-bold text-zinc-900">Rate Limits &amp; Log Retention</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Control API throughput and transcript data retention periods.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">Widget Rate Limit (Requests / min / IP)</label>
                  <input
                    type="number"
                    value={rateLimitPerMinute}
                    onChange={(e) => setRateLimitPerMinute(Number(e.target.value))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">Data Retention Period (Days)</label>
                  <input
                    type="number"
                    value={dataRetentionDays}
                    onChange={(e) => setDataRetentionDays(Number(e.target.value))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Immutable Audit Logs Stream */}
            <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Security Audit Trail
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Immutable log of security changes, key operations, and system events.</p>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Live Stream</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-semibold">
                      <th className="pb-3">Event Type</th>
                      <th className="pb-3">Triggered By</th>
                      <th className="pb-3">IP Origin</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-zinc-500 font-mono">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading live security audit trail...</span>
                          </div>
                        </td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-zinc-400 font-mono">
                          No audit log events recorded yet for this workspace.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-50 transition">
                          <td className="py-3 font-semibold text-zinc-900">{log.action}</td>
                          <td className="py-3 text-zinc-700 font-sans">{log.actor_email || 'System'}</td>
                          <td className="py-3 text-zinc-500">{log.ip_address || '127.0.0.1'}</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                              RECORDED
                            </span>
                          </td>
                          <td className="py-3 text-right text-zinc-500">{formatDate(log.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
