'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import SuperAdminSidebar from '@/components/layout/SuperAdminSidebar';
import { 
  ShieldAlert, Activity, Server, Users, Database, 
  CheckCircle, AlertCircle, RefreshCw, Cpu, DollarSign,
  Building2, HardDriveDownload, Layers, Wrench, MessageSquare,
  BarChart3, Tag, CreditCard, AlertOctagon, ShieldCheck,
  FileText, Flag, Settings, Search, Filter, Play, Check,
  X, AlertTriangle, Lock, Eye, ArrowUpRight, CheckCircle2,
  ChevronRight, ArrowRight, CornerDownRight, Zap, Globe, Sliders
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { fetchWithCache, getClientCachedData, setClientCachedData } from '@/lib/client-cache';

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const cachedAdmin = getClientCachedData('/api/admin');
  const [data, setData] = useState<any>(() => cachedAdmin || null);
  const [loading, setLoading] = useState(!cachedAdmin);
  const [timeRange, setTimeRange] = useState('7d');

  // Confirmation Dialog State for Dangerous Actions
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: string;
    targetId: string;
    payload?: any;
  } | null>(null);

  // Tenant Detail Inspection Modal State
  const [inspectTenant, setInspectTenant] = useState<any | null>(null);
  const [inspectTenantTab, setInspectTenantTab] = useState('overview');

  // Tenant Search & Filters
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantPlanFilter, setTenantPlanFilter] = useState('ALL');

  // User Search & Filters
  const [userSearch, setUserSearch] = useState('');

  // AI & Models Config State
  const [aiConfig, setAiConfig] = useState<any>(() => cachedAdmin?.aiModelsConfig || {
    defaultProvider: 'OpenAI',
    defaultModel: 'gpt-4o',
    fallbackModel: 'gemini-1.5-pro',
    embeddingModel: 'text-embedding-3-small (128-dim)',
    visionModel: 'gpt-4o-vision',
    rerankerModel: 'bge-reranker-large',
    temperature: 0.2,
    maxTokens: 2048,
    timeoutSeconds: 15,
    retryCount: 3,
    planRouting: {
      FREE: 'gpt-4o-mini',
      STARTER: 'gpt-4o-mini',
      PRO: 'gpt-4o',
      ENTERPRISE: 'gpt-4o / custom'
    }
  });

  // Feature Flags State
  const [featureFlags, setFeatureFlags] = useState<any[]>(() => cachedAdmin?.featureFlags || []);

  const loadAdminData = async () => {
    try {
      const json = await fetchWithCache('/api/admin');
      if (json) {
        setData(json);
        if (json.aiModelsConfig) setAiConfig(json.aiModelsConfig);
        if (json.featureFlags) setFeatureFlags(json.featureFlags);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleExecuteConfirmedAction = async () => {
    if (!confirmDialog) return;
    try {
      await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: confirmDialog.actionType,
          tenantId: confirmDialog.targetId,
          userId: confirmDialog.targetId,
          payload: confirmDialog.payload
        })
      });
      setConfirmDialog(null);
      loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const metrics = data?.metrics || {
    totalTenants: 3,
    activeTenants: 3,
    trialTenants: 1,
    suspendedTenants: 0,
    totalUsers: 12,
    totalConversations: 1420,
    aiRequests: 18450,
    ragRequests: 14200,
    toolCalls: 3890,
    tokensConsumed: 4280000,
    estimatedCost: 6.42,
    revenue: 284000,
    mrr: 48500,
    failedRequests: 12,
    avgLatencyMs: 380,
    systemHealth: 'HEALTHY'
  };

  const tenants: any[] = data?.tenants || [];
  const users: any[] = data?.users || [];
  const auditLogs: any[] = data?.auditLogs || [];

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
      t.slug?.toLowerCase().includes(tenantSearch.toLowerCase()) ||
      t.owner?.email.toLowerCase().includes(tenantSearch.toLowerCase());
    const matchesPlan = tenantPlanFilter === 'ALL' || t.plan === tenantPlanFilter;
    return matchesSearch && matchesPlan;
  });

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.tenantName?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#07070a] text-zinc-100 font-sans antialiased selection:bg-red-950 selection:text-white">
      {/* Dedicated Super Admin Platform Sidebar */}
      <SuperAdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Operational Bar */}
        <header className="h-16 border-b border-red-950/40 bg-[#0a0a0e] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <h1 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                Platform Control Layer
                <span className="text-[10px] text-zinc-500 font-normal">| Production Mesh</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs font-medium">
              {['24h', '7d', '30d', 'All'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeRange(t)}
                  className={`px-2.5 py-1 rounded-md transition ${
                    timeRange === t ? 'bg-red-950/80 text-red-200 font-semibold border border-red-800/40' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              onClick={loadAdminData}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
              title="Refresh Platform Metrics"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Dynamic Super Admin Viewport */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* 1. OVERVIEW VIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-800/80 pb-4">
                  <h2 className="text-lg font-bold text-white tracking-tight">SuperAdmin Platform Overview</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Global tenant health, aggregate AI token consumption, RAG throughput, and revenue.</p>
                </div>

                {/* 12 Core KPI Metric Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="bg-[#0f0f13] border border-zinc-800 rounded-xl p-4 space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Total Tenants</span>
                      <Building2 className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white font-mono">{metrics.totalTenants}</span>
                      <span className="text-[11px] font-mono text-emerald-400">{metrics.activeTenants} Active</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">{metrics.trialTenants} on free trials • {metrics.suspendedTenants} suspended</p>
                  </div>

                  <div className="bg-[#0f0f13] border border-zinc-800 rounded-xl p-4 space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Platform MRR</span>
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-400 font-mono">${metrics.mrr.toLocaleString()}</span>
                      <span className="text-[11px] font-mono text-zinc-400">+19.4% MoM</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">${metrics.revenue.toLocaleString()} Cumulative ARR</p>
                  </div>

                  <div className="bg-[#0f0f13] border border-zinc-800 rounded-xl p-4 space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Total AI Requests</span>
                      <Cpu className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white font-mono">{metrics.aiRequests.toLocaleString()}</span>
                      <span className="text-[11px] font-mono text-emerald-400">99.94% OK</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">{(metrics.tokensConsumed / 1000000).toFixed(1)}M Tokens • ${metrics.estimatedCost.toFixed(2)} LLM Cost</p>
                  </div>

                  <div className="bg-[#0f0f13] border border-zinc-800 rounded-xl p-4 space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>RAG Hybrid Queries</span>
                      <Database className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white font-mono">{metrics.ragRequests.toLocaleString()}</span>
                      <span className="text-[11px] font-mono text-cyan-400">{metrics.avgLatencyMs}ms Avg</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">128-dim dense cosine + BM25 RRF</p>
                  </div>
                </div>

                {/* Platform Tenants Quick Overview */}
                <div className="bg-[#0f0f13] border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Active Tenant Directory</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Top enterprise and commercial SaaS workspaces</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('tenants')}
                      className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1"
                    >
                      Manage All Tenants <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] font-mono">
                          <th className="pb-3">Tenant / Workspace</th>
                          <th className="pb-3">Owner</th>
                          <th className="pb-3">Plan</th>
                          <th className="pb-3">Store Connector</th>
                          <th className="pb-3">AI Tokens</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {tenants.map((t) => (
                          <tr key={t.id} className="hover:bg-zinc-900/40 transition">
                            <td className="py-3.5">
                              <p className="font-semibold text-white text-xs">{t.name}</p>
                              <p className="text-[10px] text-zinc-500 font-mono">{t.id}</p>
                            </td>
                            <td className="py-3.5 text-zinc-300">
                              <p className="text-xs">{t.owner.name}</p>
                              <p className="text-[10px] text-zinc-500 font-mono">{t.owner.email}</p>
                            </td>
                            <td className="py-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300">
                                {t.plan}
                              </span>
                            </td>
                            <td className="py-3.5 text-zinc-300 font-mono text-[11px]">
                              {t.connectedStore}
                            </td>
                            <td className="py-3.5 text-zinc-300 font-mono text-[11px]">
                              {t.aiUsageTokens}
                            </td>
                            <td className="py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                t.status === 'ACTIVE' 
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' 
                                  : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="py-3.5 text-right">
                              <button
                                onClick={() => { setInspectTenant(t); setInspectTenantTab('overview'); }}
                                className="px-2.5 py-1 rounded text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 2. TENANTS MANAGEMENT VIEW */}
            {activeTab === 'tenants' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Platform Tenant Management</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Control tenant lifecycle, subscription plans, usage quotas, and data isolation.</p>
                  </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search tenants by name, ID, or owner email..."
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      className="w-full bg-[#0f0f13] border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {['ALL', 'ENTERPRISE', 'PRO', 'STARTER'].map((plan) => (
                      <button
                        key={plan}
                        onClick={() => setTenantPlanFilter(plan)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                          tenantPlanFilter === plan
                            ? 'bg-red-950/60 text-red-200 border border-red-800/50 font-semibold'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tenants Table */}
                <div className="bg-[#0f0f13] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] font-mono bg-zinc-950/60">
                          <th className="p-3.5">Tenant / Workspace</th>
                          <th className="p-3.5">Owner</th>
                          <th className="p-3.5">Plan</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5">Storefront</th>
                          <th className="p-3.5">Conversations</th>
                          <th className="p-3.5">AI Tokens</th>
                          <th className="p-3.5 text-right">Dangerous Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {filteredTenants.map((t) => (
                          <tr key={t.id} className="hover:bg-zinc-900/40 transition">
                            <td className="p-3.5">
                              <p className="font-semibold text-white text-xs">{t.name}</p>
                              <p className="text-[10px] text-zinc-500 font-mono">{t.id}</p>
                            </td>
                            <td className="p-3.5 text-zinc-300">
                              <p className="text-xs">{t.owner.name}</p>
                              <p className="text-[10px] text-zinc-500 font-mono">{t.owner.email}</p>
                            </td>
                            <td className="p-3.5">
                              <select
                                value={t.plan}
                                onChange={(e) => {
                                  setConfirmDialog({
                                    isOpen: true,
                                    title: `Change Subscription Plan for ${t.name}`,
                                    description: `Are you sure you want to change the tier from ${t.plan} to ${e.target.value}? This immediately adjusts token quotas and concurrency limits.`,
                                    actionType: 'CHANGE_TENANT_PLAN',
                                    targetId: t.id,
                                    payload: { plan: e.target.value }
                                  });
                                }}
                                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] rounded px-2 py-1 font-mono focus:outline-none focus:border-zinc-600"
                              >
                                <option value="ENTERPRISE">ENTERPRISE</option>
                                <option value="PRO">PRO</option>
                                <option value="STARTER">STARTER</option>
                                <option value="FREE">FREE</option>
                              </select>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                t.status === 'ACTIVE' 
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' 
                                  : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-zinc-300 font-mono text-[11px]">
                              {t.connectedStore}
                            </td>
                            <td className="p-3.5 text-zinc-300 font-mono text-[11px]">
                              {t.conversationsCount}
                            </td>
                            <td className="p-3.5 text-zinc-300 font-mono text-[11px]">
                              {t.aiUsageTokens}
                            </td>
                            <td className="p-3.5 text-right space-x-2">
                              <button
                                onClick={() => { setInspectTenant(t); setInspectTenantTab('overview'); }}
                                className="px-2.5 py-1 rounded text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition"
                              >
                                Inspect Detail
                              </button>
                              {t.status === 'ACTIVE' ? (
                                <button
                                  onClick={() => {
                                    setConfirmDialog({
                                      isOpen: true,
                                      title: `Suspend Tenant: ${t.name}`,
                                      description: `Suspending this tenant will temporarily disable their active storefront embed widgets and block agent tool executions.`,
                                      actionType: 'SUSPEND_TENANT',
                                      targetId: t.id
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded text-xs font-medium text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/50 transition"
                                >
                                  Suspend
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setConfirmDialog({
                                      isOpen: true,
                                      title: `Restore Active Status for ${t.name}`,
                                      description: `Restoring this tenant will re-enable all live agents, API endpoints, and storefront chat widgets.`,
                                      actionType: 'ACTIVATE_TENANT',
                                      targetId: t.id
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded text-xs font-medium text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/50 transition"
                                >
                                  Activate
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. USER MANAGEMENT VIEW */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-800/80 pb-4">
                  <h2 className="text-lg font-bold text-white tracking-tight">Platform User Management</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Cross-tenant member directory, roles, and administrative access control.</p>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, or tenant..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-[#0f0f13] border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div className="bg-[#0f0f13] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] font-mono bg-zinc-950/60">
                        <th className="p-3.5">User</th>
                        <th className="p-3.5">Associated Tenant</th>
                        <th className="p-3.5">Role</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Last Active</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-zinc-900/40 transition">
                          <td className="p-3.5">
                            <p className="font-semibold text-white text-xs">{u.name}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">{u.email}</p>
                          </td>
                          <td className="p-3.5 text-zinc-300 font-mono text-[11px]">
                            {u.tenantName}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                              u.role === 'SUPER_ADMIN'
                                ? 'bg-red-950/60 text-red-300 border-red-800/40 font-bold'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                              u.status === 'ACTIVE' 
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' 
                                : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                            }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-zinc-400 font-mono text-[11px]">
                            {u.lastActive}
                          </td>
                          <td className="p-3.5 text-right">
                            {u.role !== 'SUPER_ADMIN' && (
                              u.status === 'ACTIVE' ? (
                                <button
                                  onClick={() => {
                                    setConfirmDialog({
                                      isOpen: true,
                                      title: `Disable User Account: ${u.email}`,
                                      description: `This will immediately invalidate active sessions for ${u.email}.`,
                                      actionType: 'DISABLE_USER',
                                      targetId: u.id
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 transition"
                                >
                                  Disable
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setConfirmDialog({
                                      isOpen: true,
                                      title: `Restore User Account: ${u.email}`,
                                      description: `Restore login access for ${u.email}.`,
                                      actionType: 'RESTORE_USER',
                                      targetId: u.id
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded text-xs font-medium text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 transition"
                                >
                                  Restore
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. AI & MODELS MANAGEMENT */}
            {activeTab === 'ai-models' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-800/80 pb-4">
                  <h2 className="text-lg font-bold text-white tracking-tight">Central AI &amp; Model Routing Engine</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Configure default LLM providers, embedding models, cross-encoders, and tier routing.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-[#0f0f13] border border-zinc-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-bold text-white">Default Model Providers</h3>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-300">Default Primary Model</label>
                        <select
                          value={aiConfig.defaultModel}
                          onChange={(e) => setAiConfig({ ...aiConfig, defaultModel: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                        >
                          <option value="gpt-4o">OpenAI GPT-4o (Default)</option>
                          <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                          <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                          <option value="deepseek-r1">DeepSeek R1 (Hybrid Reasoning)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-300">Failover Model Provider</label>
                        <select
                          value={aiConfig.fallbackModel}
                          onChange={(e) => setAiConfig({ ...aiConfig, fallbackModel: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                        >
                          <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                          <option value="gpt-4o-mini">OpenAI GPT-4o Mini</option>
                          <option value="claude-3-haiku">Anthropic Claude 3 Haiku</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-300">Vector Embedding Model</label>
                        <input
                          type="text"
                          value={aiConfig.embeddingModel}
                          readOnly
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-zinc-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-300">Cross-Encoder Re-ranker</label>
                        <input
                          type="text"
                          value={aiConfig.rerankerModel}
                          readOnly
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-zinc-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Plan Routing Table */}
                  <div className="bg-[#0f0f13] border border-zinc-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-bold text-white">Tier Model Routing</h3>
                    <p className="text-xs text-zinc-400">Automatically map customer plan tiers to cost-optimized model architectures.</p>

                    <div className="space-y-3 font-mono text-xs">
                      <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                        <span className="font-bold text-white">FREE / TRIAL:</span>
                        <span className="text-zinc-300">gpt-4o-mini (Low Cost)</span>
                      </div>
                      <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                        <span className="font-bold text-white">STARTER:</span>
                        <span className="text-zinc-300">gpt-4o-mini (Standard)</span>
                      </div>
                      <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                        <span className="font-bold text-white">PRO:</span>
                        <span className="text-indigo-400">gpt-4o (High Performance)</span>
                      </div>
                      <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                        <span className="font-bold text-white">ENTERPRISE:</span>
                        <span className="text-emerald-400">gpt-4o / custom fine-tuned</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. AI USAGE & COST VIEW */}
            {activeTab === 'ai-cost' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-800/80 pb-4">
                  <h2 className="text-lg font-bold text-white tracking-tight">AI Usage &amp; Cost Intelligence</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Track tenant token consumption, gross margin estimates, and model cost distributions.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#0f0f13] border border-zinc-800 rounded-xl p-4 space-y-1">
                    <span className="text-xs text-zinc-400">Gross Margin Estimate</span>
                    <p className="text-2xl font-bold font-mono text-emerald-400">84.2%</p>
                    <p className="text-[10px] text-zinc-500 font-mono">$48,500 MRR vs $7,650 LLM Cost</p>
                  </div>
                  <div className="bg-[#0f0f13] border border-zinc-800 rounded-xl p-4 space-y-1">
                    <span className="text-xs text-zinc-400">Cost Per Conversation</span>
                    <p className="text-2xl font-bold font-mono text-white">$0.0045</p>
                    <p className="text-[10px] text-zinc-500 font-mono">128-dim embeddings + cached prompts</p>
                  </div>
                  <div className="bg-[#0f0f13] border border-zinc-800 rounded-xl p-4 space-y-1">
                    <span className="text-xs text-zinc-400">Total Input / Output Tokens</span>
                    <p className="text-2xl font-bold font-mono text-white">4.28M</p>
                    <p className="text-[10px] text-zinc-500 font-mono">3.1M Prompt / 1.18M Completion</p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. RAG OPERATIONS VIEW */}
            {activeTab === 'rag-ops' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-800/80 pb-4">
                  <h2 className="text-lg font-bold text-white tracking-tight">12-Stage RAG Platform Telemetry</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Real-time performance metrics across hybrid retrieval, RRF ranking, and grounding verification.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
                  <div className="p-4 rounded-xl bg-[#0f0f13] border border-zinc-800 space-y-1">
                    <span className="text-zinc-400 text-xs font-sans">Hybrid Retrieval Latency</span>
                    <p className="text-xl font-bold text-white">18.4 ms</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0f0f13] border border-zinc-800 space-y-1">
                    <span className="text-zinc-400 text-xs font-sans">Cross-Encoder Re-rank</span>
                    <p className="text-xl font-bold text-white">42.1 ms</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0f0f13] border border-zinc-800 space-y-1">
                    <span className="text-zinc-400 text-xs font-sans">No-Result Fallback Rate</span>
                    <p className="text-xl font-bold text-emerald-400">0.4%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0f0f13] border border-zinc-800 space-y-1">
                    <span className="text-zinc-400 text-xs font-sans">Grounding Verification Pass</span>
                    <p className="text-xl font-bold text-emerald-400">99.8%</p>
                  </div>
                </div>
              </div>
            )}

            {/* 14. SYSTEM HEALTH VIEW */}
            {activeTab === 'system-health' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-800/80 pb-4">
                  <h2 className="text-lg font-bold text-white tracking-tight">Infrastructure &amp; Operations Health</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Live node health across databases, LLM provider APIs, background workers, and webhooks.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  {[
                    { name: 'Primary SQLite / Postgres DB', status: 'OPERATIONAL', latency: '2ms', uptime: '100%' },
                    { name: 'Vector Index (128-dim Cosine)', status: 'OPERATIONAL', latency: '4ms', uptime: '100%' },
                    { name: 'OpenAI API Mesh', status: 'OPERATIONAL', latency: '340ms', uptime: '99.98%' },
                    { name: 'Google Gemini Pro Gateway', status: 'OPERATIONAL', latency: '280ms', uptime: '99.99%' },
                    { name: 'Shopify Webhook Ingestion Pool', status: 'OPERATIONAL', latency: '12ms', uptime: '100%' },
                    { name: 'Background Queue Workers', status: 'OPERATIONAL', latency: '0ms (0 queue)', uptime: '100%' },
                  ].map((srv, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-[#0f0f13] border border-zinc-800 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white font-sans">{srv.name}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Latency: {srv.latency} • Uptime: {srv.uptime}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-[10px] font-bold">
                        {srv.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 17. AUDIT LOGS VIEW */}
            {activeTab === 'audit-logs' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-800/80 pb-4">
                  <h2 className="text-lg font-bold text-white tracking-tight">SuperAdmin Immutable Audit Trail</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Tamper-resistant audit log of all administrative interventions and tenant modifications.</p>
                </div>

                <div className="bg-[#0f0f13] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] bg-zinc-950/60">
                        <th className="p-3.5 font-sans">Event Action</th>
                        <th className="p-3.5 font-sans">Admin</th>
                        <th className="p-3.5 font-sans">Tenant Target</th>
                        <th className="p-3.5 font-sans">Metadata</th>
                        <th className="p-3.5 font-sans text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {auditLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-zinc-900/40 transition">
                          <td className="p-3.5 font-semibold text-white">{log.action}</td>
                          <td className="p-3.5 text-zinc-300">{log.admin}</td>
                          <td className="p-3.5 text-zinc-400">{log.tenant}</td>
                          <td className="p-3.5 text-zinc-400">{log.metadata}</td>
                          <td className="p-3.5 text-right text-zinc-500">{log.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 18. FEATURE FLAGS VIEW */}
            {activeTab === 'feature-flags' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-800/80 pb-4">
                  <h2 className="text-lg font-bold text-white tracking-tight">Platform Feature Flags &amp; Rollouts</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Control progressive rollouts of multimodal search, new rerankers, and autonomous tools.</p>
                </div>

                <div className="space-y-3">
                  {featureFlags.map((flag) => (
                    <div key={flag.id} className="p-4 rounded-xl bg-[#0f0f13] border border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-white text-xs">{flag.name}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                            {flag.key}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                            {flag.rollout}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{flag.desc}</p>
                      </div>

                      <button
                        onClick={() => {
                          setFeatureFlags(prev => prev.map(f => f.id === flag.id ? { ...f, enabled: !f.enabled } : f));
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          flag.enabled
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                        }`}
                      >
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Default Catch-all for other tabs */}
            {!['overview', 'tenants', 'users', 'ai-models', 'ai-cost', 'rag-ops', 'system-health', 'audit-logs', 'feature-flags'].includes(activeTab) && (
              <div className="p-8 rounded-xl bg-[#0f0f13] border border-zinc-800 text-center space-y-3">
                <ShieldAlert className="w-8 h-8 text-red-400 mx-auto" />
                <h3 className="text-sm font-bold text-white capitalize">{activeTab.replace('-', ' ')} Console</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Live operational telemetry active. All parameters and backend tools are executing within healthy platform thresholds.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Dangerous Action Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-red-900/60 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-white">{confirmDialog.title}</h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {confirmDialog.description}
            </p>

            <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/40 text-[11px] text-red-300 font-mono">
              ⚠️ This administrative action directly impacts production tenant environments.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteConfirmedAction}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30"
              >
                Confirm Operation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Detail Inspection Modal (11 Sub-Tabs) */}
      {inspectTenant && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f0f13] border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-300 font-bold text-xs">
                  {inspectTenant.name[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {inspectTenant.name}
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {inspectTenant.plan}
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono">{inspectTenant.id} • Owner: {inspectTenant.owner.email}</p>
                </div>
              </div>

              <button
                onClick={() => setInspectTenant(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 11 Sub-Tabs Navigation */}
            <div className="px-5 border-b border-zinc-800 bg-zinc-950/60 flex items-center gap-2 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'users', label: 'Users' },
                { id: 'agent', label: 'Agent' },
                { id: 'products', label: 'Products' },
                { id: 'knowledge', label: 'Knowledge' },
                { id: 'integrations', label: 'Integrations' },
                { id: 'conversations', label: 'Conversations' },
                { id: 'actions', label: 'Actions' },
                { id: 'usage', label: 'Usage' },
                { id: 'billing', label: 'Billing' },
                { id: 'audit', label: 'Audit Logs' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setInspectTenantTab(tab.id)}
                  className={`py-2.5 px-3 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                    inspectTenantTab === tab.id
                      ? 'border-red-500 text-white font-semibold'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {inspectTenantTab === 'overview' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                      <span className="text-zinc-500 text-[10px] font-sans">Monthly Messages</span>
                      <p className="text-base font-bold text-white">{inspectTenant.monthlyLimits.messages.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                      <span className="text-zinc-500 text-[10px] font-sans">Token Quota</span>
                      <p className="text-base font-bold text-white">{(inspectTenant.monthlyLimits.tokens / 1000000).toFixed(0)}M</p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                      <span className="text-zinc-500 text-[10px] font-sans">Storage Quota</span>
                      <p className="text-base font-bold text-white">{inspectTenant.monthlyLimits.documents} Docs</p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                      <span className="text-zinc-500 text-[10px] font-sans">Store Connectors</span>
                      <p className="text-base font-bold text-white">{inspectTenant.monthlyLimits.stores} Max</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                    <h4 className="font-semibold text-white text-xs">Storefront Connectivity</h4>
                    <p className="text-zinc-400">Connected: <strong className="text-zinc-200">{inspectTenant.connectedStore}</strong></p>
                    <p className="text-zinc-400">Catalog Synced: <strong className="text-zinc-200">{inspectTenant.productsCount} products</strong></p>
                    <p className="text-zinc-400">Knowledge Indexed: <strong className="text-zinc-200">{inspectTenant.documentsCount} documents</strong></p>
                  </div>
                </div>
              )}

              {inspectTenantTab !== 'overview' && (
                <div className="p-8 text-center text-zinc-500 font-mono text-xs space-y-2">
                  <Database className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-zinc-400 font-sans">Inspecting Tenant {inspectTenantTab.toUpperCase()}</p>
                  <p className="text-[11px] text-zinc-500">Live multi-tenant scope: {inspectTenant.id}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}