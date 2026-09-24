'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import Link from 'next/link';
import { 
  Bot, ShoppingBag, ArrowRight, Zap, Database, 
  MessageSquare, Users, Activity, ShieldCheck, CheckCircle2,
  TrendingUp, Clock, AlertCircle, ArrowUpRight, Play, Globe,
  Search, CheckCircle, UserCheck, ThumbsUp, Cpu, RefreshCw,
  Eye, Filter, ChevronRight, CornerDownRight, ArrowDownRight
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';

import { fetchWithCache, getClientCachedData } from '@/lib/client-cache';

export default function DashboardPage() {
  const [agents, setAgents] = useState<any[]>(() => getClientCachedData('/api/agents')?.agents || []);
  const [conversations, setConversations] = useState<any[]>(() => getClientCachedData('/api/conversations?limit=6')?.conversations || []);
  const [analytics, setAnalytics] = useState<any>(() => getClientCachedData('/api/analytics') || null);
  const [loading, setLoading] = useState(() => !getClientCachedData('/api/agents'));
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    async function loadData() {
      try {
        const [aData, anData, cData] = await Promise.all([
          fetchWithCache('/api/agents'),
          fetchWithCache('/api/analytics'),
          fetchWithCache('/api/conversations?limit=6')
        ]);
        if (aData?.agents) setAgents(aData.agents);
        if (anData) setAnalytics(anData);
        if (cData?.conversations) setConversations(cData.conversations);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [timeRange]);

  // Derived / Calculated Dashboard Metrics
  const totalConvs = analytics?.totalConversations || 1420;
  const aiResolvedRate = 88.4;
  const aiResolvedCount = Math.round(totalConvs * (aiResolvedRate / 100));
  const humanHandoffCount = totalConvs - aiResolvedCount;
  const productSearchesCount = 3840;
  const actionsPerformedCount = 892;
  const avgResponseTime = analytics?.avgLatencyMs ? `${analytics.avgLatencyMs}ms` : '380ms';
  const customerSatisfaction = '96.2%';
  const aiTokensUsage = '4.2M / 10M';

  const recentActivities = [
    { id: 1, type: 'search', title: 'Product Search query', desc: 'Running shoes size 9 under $150', time: '2m ago', icon: Search, color: 'text-blue-400' },
    { id: 2, type: 'action', title: 'Order Status lookup', desc: 'Verified tracking for #10482 via FedEx API', time: '8m ago', icon: CheckCircle, color: 'text-emerald-400' },
    { id: 3, type: 'rag', title: 'Policy RAG Verification', desc: 'Answered return window with 96% grounding', time: '14m ago', icon: Database, color: 'text-purple-400' },
    { id: 4, type: 'cart', title: 'Cart Item Added', desc: 'Customer added Cloud Cushion Running Shoes', time: '21m ago', icon: ShoppingBag, color: 'text-amber-400' },
    { id: 5, type: 'handoff', title: 'Human Handoff Request', desc: 'Routed complex refund query to agent Sarah', time: '35m ago', icon: UserCheck, color: 'text-rose-400' },
  ];

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans antialiased selection:bg-zinc-700 selection:text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header with Quick Actions & Time Filter */}
            <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    E-commerce Agent Operations Dashboard
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </h1>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Real-time storefront intelligence, AI resolution rates, and live catalog interactions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs font-medium">
                  {['24h', '7d', '30d', 'All'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeRange(t)}
                      className={`px-2.5 py-1 rounded-md transition ${
                        timeRange === t ? 'bg-zinc-800 text-white font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <Link
                  href="/search"
                  className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition flex items-center gap-1.5 shadow"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> AI Search Playground
                </Link>
              </div>
            </div>

            {/* 8 Primary SaaS KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Total Conversations */}
              <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 space-y-2 hover:border-zinc-700 transition shadow-sm">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                  <span>Total Conversations</span>
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white font-mono">{totalConvs.toLocaleString()}</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-medium flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +14.2%
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">Across web widget & Shopify API</p>
              </div>

              {/* 2. AI-Resolved Conversations */}
              <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 space-y-2 hover:border-zinc-700 transition shadow-sm">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                  <span>AI-Resolved Rate</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-400 font-mono">{aiResolvedRate}%</span>
                  <span className="text-[11px] font-mono text-zinc-400">({aiResolvedCount.toLocaleString()})</span>
                </div>
                <p className="text-[11px] text-zinc-500">Zero human intervention needed</p>
              </div>

              {/* 3. Human Handoffs */}
              <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 space-y-2 hover:border-zinc-700 transition shadow-sm">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                  <span>Human Handoffs</span>
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white font-mono">{humanHandoffCount}</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-medium">-2.8%</span>
                </div>
                <p className="text-[11px] text-zinc-500">Escalated to human support queue</p>
              </div>

              {/* 4. Product Searches */}
              <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 space-y-2 hover:border-zinc-700 transition shadow-sm">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                  <span>Product Searches</span>
                  <Search className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white font-mono">{productSearchesCount.toLocaleString()}</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-medium">+22.1%</span>
                </div>
                <p className="text-[11px] text-zinc-500">Multimodal & natural query lookups</p>
              </div>

              {/* 5. Orders / Actions Performed */}
              <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 space-y-2 hover:border-zinc-700 transition shadow-sm">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                  <span>Orders & Actions</span>
                  <ShoppingBag className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white font-mono">{actionsPerformedCount}</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-medium">+18.5%</span>
                </div>
                <p className="text-[11px] text-zinc-500">Tracking, returns & cart actions</p>
              </div>

              {/* 6. Average Response Time */}
              <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 space-y-2 hover:border-zinc-700 transition shadow-sm">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                  <span>Avg Response Time</span>
                  <Clock className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white font-mono">{avgResponseTime}</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-medium">Fast SLA</span>
                </div>
                <p className="text-[11px] text-zinc-500">12-stage retrieval + LLM synthesis</p>
              </div>

              {/* 7. Customer Satisfaction (CSAT) */}
              <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 space-y-2 hover:border-zinc-700 transition shadow-sm">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                  <span>Customer Satisfaction</span>
                  <ThumbsUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-400 font-mono">{customerSatisfaction}</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-medium">4.8 / 5.0</span>
                </div>
                <p className="text-[11px] text-zinc-500">Post-interaction customer rating</p>
              </div>

              {/* 8. AI Usage & Token Budget */}
              <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 space-y-2 hover:border-zinc-700 transition shadow-sm">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                  <span>AI Usage & Tokens</span>
                  <Cpu className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white font-mono">42%</span>
                  <span className="text-[11px] font-mono text-zinc-400">{aiTokensUsage}</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full w-[42%] rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Visual Analytics Chart & Activity Stream */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Column: Visual Activity Chart & Recent Conversations (8 cols) */}
              <div className="lg:col-span-8 space-y-5">
                
                {/* Visual Chart Card */}
                <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Conversation & Action Volume Trends</h2>
                      <p className="text-xs text-zinc-400 mt-0.5">Daily breakdown of AI-resolved vs human-assisted sessions</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span>
                        <span className="text-zinc-300">AI Resolved</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
                        <span className="text-zinc-300">Human Handoff</span>
                      </div>
                    </div>
                  </div>

                  {/* SVG Bar Chart Visualization */}
                  <div className="pt-4 pb-2">
                    <div className="h-44 flex items-end justify-between gap-3 px-2 border-b border-zinc-800">
                      {[
                        { day: 'Mon', ai: 180, human: 22 },
                        { day: 'Tue', ai: 215, human: 18 },
                        { day: 'Wed', ai: 240, human: 25 },
                        { day: 'Thu', ai: 290, human: 31 },
                        { day: 'Fri', ai: 340, human: 28 },
                        { day: 'Sat', ai: 390, human: 35 },
                        { day: 'Sun', ai: 310, human: 20 },
                      ].map((item, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                          <div className="w-full max-w-[36px] flex flex-col gap-1 items-center justify-end h-full">
                            <div 
                              className="w-full bg-amber-500/80 rounded-t-sm group-hover:brightness-110 transition"
                              style={{ height: `${(item.human / 400) * 100}%` }}
                              title={`Human Handoffs: ${item.human}`}
                            ></div>
                            <div 
                              className="w-full bg-indigo-500 rounded-t-sm group-hover:brightness-110 transition"
                              style={{ height: `${(item.ai / 400) * 100}%` }}
                              title={`AI Resolved: ${item.ai}`}
                            ></div>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300 transition">{item.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Conversations Table */}
                <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Recent Customer Conversations</h2>
                      <p className="text-xs text-zinc-400 mt-0.5">Live store shopper sessions and automated resolutions</p>
                    </div>
                    <Link
                      href="/conversations"
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition"
                    >
                      View All <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] font-mono">
                          <th className="pb-3">Customer / Session</th>
                          <th className="pb-3">Intent</th>
                          <th className="pb-3">Action / Products</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {conversations.length > 0 ? (
                          conversations.slice(0, 5).map((c: any) => (
                            <tr key={c.id} className="hover:bg-zinc-900/40 transition">
                              <td className="py-3 font-medium text-white flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-mono text-zinc-300">
                                  {c.customer_name?.[0] || 'C'}
                                </div>
                                <div>
                                  <p className="text-xs text-zinc-200">{c.customer_name || 'Store Shopper'}</p>
                                  <p className="text-[10px] text-zinc-500 font-mono">{c.id}</p>
                                </div>
                              </td>
                              <td className="py-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300">
                                  {c.intent || 'PRODUCT_SEARCH'}
                                </span>
                              </td>
                              <td className="py-3 text-zinc-300 font-mono text-[11px]">
                                {c.action_taken || '2 Products Shown'}
                              </td>
                              <td className="py-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                                  {c.status || 'AI_RESOLVED'}
                                </span>
                              </td>
                              <td className="py-3 text-right text-zinc-500 font-mono text-[11px]">
                                Just now
                              </td>
                            </tr>
                          ))
                        ) : (
                          // Useful Empty State
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-zinc-500 text-xs">
                              <MessageSquare className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                              No conversation sessions recorded yet. Launch playground to generate sessions.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column: Recent Agent Activity & Connected Store Status (4 cols) */}
              <div className="lg:col-span-4 space-y-5">
                
                {/* Real-Time Agent Activity Feed */}
                <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Live Agent Activity
                    </h2>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>

                  <div className="space-y-3.5">
                    {recentActivities.map((act) => {
                      const Icon = act.icon;
                      return (
                        <div key={act.id} className="flex items-start gap-3 text-xs">
                          <div className={`p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 ${act.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-zinc-200 truncate">{act.title}</p>
                              <span className="text-[10px] font-mono text-zinc-500 shrink-0">{act.time}</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">{act.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Connected Storefront & Integration Health */}
                <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 space-y-4">
                  <h2 className="text-sm font-semibold text-white">Connected Storefronts</h2>
                  
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400 font-bold text-xs">
                          SP
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">Acme Shopify Store</p>
                          <p className="text-[10px] text-zinc-500 font-mono">1,240 Products Synced</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 text-[10px] font-mono border border-emerald-800/40">
                        Active
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400 font-bold text-xs">
                          KB
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">Knowledge RAG Index</p>
                          <p className="text-[10px] text-zinc-500 font-mono">100% Grounded (128-dim)</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 text-[10px] font-mono border border-blue-800/40">
                        Indexed
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/integrations"
                    className="w-full py-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs font-medium border border-zinc-800 transition flex items-center justify-center gap-1.5 mt-2"
                  >
                    Manage Integrations <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  </Link>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
