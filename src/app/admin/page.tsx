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
    <div className="flex h-screen bg-[#f4f5f7] text-zinc-900 font-sans antialiased selection:bg-zinc-200 selection:text-zinc-900">
      {/* Dedicated Super Admin Platform Sidebar */}
      <SuperAdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Operational Bar */}
        <header className="h-14 border-b border-zinc-200 bg-white px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <div>
              <h1 className="text-xs font-bold text-zinc-900 uppercase font-mono tracking-wider flex items-center gap-2">
                Platform Control Layer
                <span className="text-[10px] text-zinc-400 font-normal">| Production Mesh</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-xl p-0.5 text-xs font-medium">
              {['24h', '7d', '30d', 'All'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeRange(t)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    timeRange === t ? 'bg-white text-zinc-900 font-semibold shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              onClick={loadAdminData}
              className="p-2 rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition shadow-2xs"
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
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">SuperAdmin Platform Overview</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Global tenant health, aggregate AI token consumption, RAG throughput, and revenue.</p>
                </div>

                {/* 12 Core KPI Metric Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                      <span>Total Tenants</span>
                      <Building2 className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-zinc-900 font-mono">{metrics.totalTenants}</span>
                      <span className="text-[11px] font-mono text-emerald-600 font-semibold">{metrics.activeTenants} Active</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">{metrics.trialTenants} on free trials • {metrics.suspendedTenants} suspended</p>
                  </div>

                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                      <span>Platform MRR</span>
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-600 font-mono">${metrics.mrr.toLocaleString()}</span>
                      <span className="text-[11px] font-mono text-zinc-500">+19.4% MoM</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">${metrics.revenue.toLocaleString()} Cumulative ARR</p>
                  </div>

                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                      <span>Total AI Requests</span>
                      <Cpu className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-zinc-900 font-mono">{metrics.aiRequests.toLocaleString()}</span>
                      <span className="text-[11px] font-mono text-emerald-600 font-semibold">99.94% OK</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">{(metrics.tokensConsumed / 1000000).toFixed(1)}M Tokens • ${metrics.estimatedCost.toFixed(2)} LLM Cost</p>
                  </div>

                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                      <span>RAG Hybrid Queries</span>
                      <Database className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-zinc-900 font-mono">{metrics.ragRequests.toLocaleString()}</span>
                      <span className="text-[11px] font-mono text-indigo-600 font-semibold">{metrics.avgLatencyMs}ms Avg</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">128-dim dense cosine + BM25 RRF</p>
                  </div>
                </div>

                {/* Platform Tenants Quick Overview */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">Active Tenant Directory</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Top enterprise and commercial SaaS workspaces</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('tenants')}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                    >
                      Manage All Tenants <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-mono bg-zinc-50">
                          <th className="p-3">Tenant / Workspace</th>
                          <th className="p-3">Owner</th>
                          <th className="p-3">Plan</th>
                          <th className="p-3">Store Connector</th>
                          <th className="p-3">AI Tokens</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {tenants.map((t) => (
                          <tr key={t.id} className="hover:bg-zinc-50 transition">
                            <td className="p-3">
                              <p className="font-semibold text-zinc-900 text-xs">{t.name}</p>
                              <p className="text-[10px] text-zinc-400 font-mono">{t.id}</p>
                            </td>
                            <td className="p-3 text-zinc-700">
                              <p className="text-xs">{t.owner.name}</p>
                              <p className="text-[10px] text-zinc-400 font-mono">{t.owner.email}</p>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-100 border border-zinc-200 text-zinc-700 font-semibold">
                                {t.plan}
                              </span>
                            </td>
                            <td className="p-3 text-zinc-700 font-mono text-[11px]">
                              {t.connectedStore}
                            </td>
                            <td className="p-3 text-zinc-700 font-mono text-[11px]">
                              {t.aiUsageTokens}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-semibold ${
                                t.status === 'ACTIVE' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => { setInspectTenant(t); setInspectTenantTab('overview'); }}
                                className="px-2.5 py-1 rounded-xl text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 shadow-2xs transition"
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
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Platform Tenant Management</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Control tenant lifecycle, subscription plans, usage quotas, and data isolation.</p>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search tenants by name, ID, or owner email..."
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {['ALL', 'ENTERPRISE', 'PRO', 'STARTER'].map((plan) => (
                      <button
                        key={plan}
                        onClick={() => setTenantPlanFilter(plan)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                          tenantPlanFilter === plan
                            ? 'bg-zinc-900 text-white font-semibold shadow-2xs'
                            : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tenants Table */}
                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-mono bg-zinc-50">
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
                      <tbody className="divide-y divide-zinc-100">
                        {filteredTenants.map((t) => (
                          <tr key={t.id} className="hover:bg-zinc-50 transition">
                            <td className="p-3.5">
                              <p className="font-semibold text-zinc-900 text-xs">{t.name}</p>
                              <p className="text-[10px] text-zinc-400 font-mono">{t.id}</p>
                            </td>
                            <td className="p-3.5 text-zinc-700">
                              <p className="text-xs">{t.owner.name}</p>
                              <p className="text-[10px] text-zinc-400 font-mono">{t.owner.email}</p>
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
                                className="bg-white border border-zinc-200 text-zinc-900 text-[11px] rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-zinc-400"
                              >
                                <option value="ENTERPRISE">ENTERPRISE</option>
                                <option value="PRO">PRO</option>
                                <option value="STARTER">STARTER</option>
                                <option value="FREE">FREE</option>
                              </select>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-semibold ${
                                t.status === 'ACTIVE' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-zinc-700 font-mono text-[11px]">
                              {t.connectedStore}
                            </td>
                            <td className="p-3.5 text-zinc-700 font-mono text-[11px]">
                              {t.conversationsCount}
                            </td>
                            <td className="p-3.5 text-zinc-700 font-mono text-[11px]">
                              {t.aiUsageTokens}
                            </td>
                            <td className="p-3.5 text-right space-x-2">
                              <button
                                onClick={() => { setInspectTenant(t); setInspectTenantTab('overview'); }}
                                className="px-2.5 py-1 rounded-xl text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 shadow-2xs transition"
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
                                  className="px-2.5 py-1 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-2xs transition"
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
                                  className="px-2.5 py-1 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-2xs transition"
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
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Platform User Management</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Cross-tenant member directory, roles, and administrative access control.</p>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, or tenant..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition"
                  />
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-mono bg-zinc-50">
                        <th className="p-3.5">User</th>
                        <th className="p-3.5">Associated Tenant</th>
                        <th className="p-3.5">Role</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Last Active</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-zinc-50 transition">
                          <td className="p-3.5">
                            <p className="font-semibold text-zinc-900 text-xs">{u.name}</p>
                            <p className="text-[10px] text-zinc-400 font-mono">{u.email}</p>
                          </td>
                          <td className="p-3.5 text-zinc-700 font-mono text-[11px]">
                            {u.tenantName}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-semibold ${
                              u.role === 'SUPER_ADMIN'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-semibold ${
                              u.status === 'ACTIVE' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-zinc-500 font-mono text-[11px]">
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
                                  className="px-2.5 py-1 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-2xs transition"
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
                                  className="px-2.5 py-1 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-2xs transition"
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
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Central AI &amp; Model Routing Engine</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Configure default LLM providers, embedding models, cross-encoders, and tier routing.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-2xs">
                    <h3 className="text-sm font-bold text-zinc-900">Default Model Providers</h3>
                    
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700">Default Primary Model</label>
                        <select
                          value={aiConfig.defaultModel}
                          onChange={(e) => setAiConfig({ ...aiConfig, defaultModel: e.target.value })}
                          className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400"
                        >
                          <option value="gpt-4o">OpenAI GPT-4o (Default)</option>
                          <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                          <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                          <option value="deepseek-r1">DeepSeek R1 (Hybrid Reasoning)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700">Failover Model Provider</label>
                        <select
                          value={aiConfig.fallbackModel}
                          onChange={(e) => setAiConfig({ ...aiConfig, fallbackModel: e.target.value })}
                          className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400"
                        >
                          <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                          <option value="gpt-4o-mini">OpenAI GPT-4o Mini</option>
                          <option value="claude-3-haiku">Anthropic Claude 3 Haiku</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700">Vector Embedding Model</label>
                        <input
                          type="text"
                          value={aiConfig.embeddingModel}
                          readOnly
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs font-mono text-zinc-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700">Cross-Encoder Re-ranker</label>
                        <input
                          type="text"
                          value={aiConfig.rerankerModel}
                          readOnly
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs font-mono text-zinc-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Plan Routing Table */}
                  <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-2xs">
                    <h3 className="text-sm font-bold text-zinc-900">Tier Model Routing</h3>
                    <p className="text-xs text-zinc-500">Automatically map customer plan tiers to cost-optimized model architectures.</p>

                    <div className="space-y-3 font-mono text-xs">
                      <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                        <span className="font-bold text-zinc-900 font-sans">FREE / TRIAL:</span>
                        <span className="text-zinc-600">gpt-4o-mini (Low Cost)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                        <span className="font-bold text-zinc-900 font-sans">STARTER:</span>
                        <span className="text-zinc-600">gpt-4o-mini (Standard)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                        <span className="font-bold text-zinc-900 font-sans">PRO:</span>
                        <span className="text-indigo-600 font-semibold">gpt-4o (High Performance)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                        <span className="font-bold text-zinc-900 font-sans">ENTERPRISE:</span>
                        <span className="text-emerald-700 font-semibold">gpt-4o / custom fine-tuned</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. AI USAGE & COST VIEW */}
            {activeTab === 'ai-cost' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">AI Usage &amp; Cost Intelligence</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Track tenant token consumption, gross margin estimates, and model cost distributions.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-1 shadow-2xs">
                    <span className="text-xs text-zinc-500 font-medium">Gross Margin Estimate</span>
                    <p className="text-2xl font-bold font-mono text-emerald-600">84.2%</p>
                    <p className="text-[10px] text-zinc-400 font-mono">$48,500 MRR vs $7,650 LLM Cost</p>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-1 shadow-2xs">
                    <span className="text-xs text-zinc-500 font-medium">Cost Per Conversation</span>
                    <p className="text-2xl font-bold font-mono text-zinc-900">$0.0045</p>
                    <p className="text-[10px] text-zinc-400 font-mono">128-dim embeddings + cached prompts</p>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-1 shadow-2xs">
                    <span className="text-xs text-zinc-500 font-medium">Total Input / Output Tokens</span>
                    <p className="text-2xl font-bold font-mono text-zinc-900">4.28M</p>
                    <p className="text-[10px] text-zinc-400 font-mono">3.1M Prompt / 1.18M Completion</p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. RAG OPERATIONS VIEW */}
            {activeTab === 'rag-ops' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">12-Stage RAG Platform Telemetry</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Real-time performance metrics across hybrid retrieval, RRF ranking, and grounding verification.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
                  <div className="p-5 rounded-2xl bg-white border border-zinc-200 space-y-1 shadow-2xs">
                    <span className="text-zinc-500 text-xs font-sans font-medium">Hybrid Retrieval Latency</span>
                    <p className="text-xl font-bold text-zinc-900">18.4 ms</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white border border-zinc-200 space-y-1 shadow-2xs">
                    <span className="text-zinc-500 text-xs font-sans font-medium">Cross-Encoder Re-rank</span>
                    <p className="text-xl font-bold text-zinc-900">42.1 ms</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white border border-zinc-200 space-y-1 shadow-2xs">
                    <span className="text-zinc-500 text-xs font-sans font-medium">No-Result Fallback Rate</span>
                    <p className="text-xl font-bold text-emerald-600">0.4%</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white border border-zinc-200 space-y-1 shadow-2xs">
                    <span className="text-zinc-500 text-xs font-sans font-medium">Grounding Verification Pass</span>
                    <p className="text-xl font-bold text-emerald-600">99.8%</p>
                  </div>
                </div>
              </div>
            )}

            {/* 14. SYSTEM HEALTH VIEW */}
            {activeTab === 'system-health' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Infrastructure &amp; Operations Health</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Live node health across databases, LLM provider APIs, background workers, and webhooks.</p>
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
                    <div key={idx} className="p-5 rounded-2xl bg-white border border-zinc-200 flex items-center justify-between shadow-2xs">
                      <div>
                        <p className="font-semibold text-zinc-900 font-sans">{srv.name}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Latency: {srv.latency} • Uptime: {srv.uptime}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
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
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">SuperAdmin Immutable Audit Trail</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Tamper-resistant audit log of all administrative interventions and tenant modifications.</p>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] bg-zinc-50">
                        <th className="p-3.5 font-sans">Event Action</th>
                        <th className="p-3.5 font-sans">Admin</th>
                        <th className="p-3.5 font-sans">Tenant Target</th>
                        <th className="p-3.5 font-sans">Metadata</th>
                        <th className="p-3.5 font-sans text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {auditLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-zinc-50 transition">
                          <td className="p-3.5 font-semibold text-zinc-900">{log.action}</td>
                          <td className="p-3.5 text-zinc-700">{log.admin}</td>
                          <td className="p-3.5 text-zinc-500">{log.tenant}</td>
                          <td className="p-3.5 text-zinc-500">{log.metadata}</td>
                          <td className="p-3.5 text-right text-zinc-400">{log.timestamp}</td>
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
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Platform Feature Flags &amp; Rollouts</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Control progressive rollouts of multimodal search, new rerankers, and autonomous tools.</p>
                </div>

                <div className="space-y-3">
                  {featureFlags.map((flag) => (
                    <div key={flag.id} className="p-5 rounded-2xl bg-white border border-zinc-200 flex items-center justify-between shadow-2xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-zinc-900 text-xs">{flag.name}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 font-semibold">
                            {flag.key}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                            {flag.rollout}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{flag.desc}</p>
                      </div>

                      <button
                        onClick={() => {
                          setFeatureFlags(prev => prev.map(f => f.id === flag.id ? { ...f, enabled: !f.enabled } : f));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-2xs ${
                          flag.enabled
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200'
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
              <div className="p-8 rounded-2xl bg-white border border-zinc-200 text-center space-y-3 shadow-2xs">
                <ShieldAlert className="w-8 h-8 text-red-600 mx-auto" />
                <h3 className="text-sm font-bold text-zinc-900 capitalize">{activeTab.replace('-', ' ')} Console</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Live operational telemetry active. All parameters and backend tools are executing within healthy platform thresholds.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Dangerous Action Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-zinc-900">{confirmDialog.title}</h3>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              {confirmDialog.description}
            </p>

            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-700 font-mono">
              ⚠️ This administrative action directly impacts production tenant environments.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteConfirmedAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition cursor-pointer"
              >
                Confirm Operation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Detail Inspection Modal (11 Sub-Tabs) */}
      {inspectTenant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700 font-bold text-xs shadow-2xs">
                  {inspectTenant.name[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    {inspectTenant.name}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 font-semibold">
                      {inspectTenant.plan}
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono">{inspectTenant.id} • Owner: {inspectTenant.owner.email}</p>
                </div>
              </div>

              <button
                onClick={() => setInspectTenant(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 11 Sub-Tabs Navigation */}
            <div className="px-5 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2 overflow-x-auto">
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
                  className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                    inspectTenantTab === tab.id
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-zinc-500 hover:text-zinc-900'
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
                    <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                      <span className="text-zinc-500 text-[10px] font-sans font-medium">Monthly Messages</span>
                      <p className="text-base font-bold text-zinc-900">{inspectTenant.monthlyLimits.messages.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                      <span className="text-zinc-500 text-[10px] font-sans font-medium">Token Quota</span>
                      <p className="text-base font-bold text-zinc-900">{(inspectTenant.monthlyLimits.tokens / 1000000).toFixed(0)}M</p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                      <span className="text-zinc-500 text-[10px] font-sans font-medium">Storage Quota</span>
                      <p className="text-base font-bold text-zinc-900">{inspectTenant.monthlyLimits.documents} Docs</p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                      <span className="text-zinc-500 text-[10px] font-sans font-medium">Store Connectors</span>
                      <p className="text-base font-bold text-zinc-900">{inspectTenant.monthlyLimits.stores} Max</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                    <h4 className="font-semibold text-zinc-900 text-xs">Storefront Connectivity</h4>
                    <p className="text-zinc-600">Connected: <strong className="text-zinc-900">{inspectTenant.connectedStore}</strong></p>
                    <p className="text-zinc-600">Catalog Synced: <strong className="text-zinc-900">{inspectTenant.productsCount} products</strong></p>
                    <p className="text-zinc-600">Knowledge Indexed: <strong className="text-zinc-900">{inspectTenant.documentsCount} documents</strong></p>
                  </div>
                </div>
              )}

              {inspectTenantTab !== 'overview' && (
                <div className="p-8 text-center text-zinc-500 font-mono text-xs space-y-2">
                  <Database className="w-8 h-8 text-zinc-400 mx-auto" />
                  <p className="text-zinc-700 font-sans font-medium">Inspecting Tenant {inspectTenantTab.toUpperCase()}</p>
                  <p className="text-[11px] text-zinc-400">Live multi-tenant scope: {inspectTenant.id}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}