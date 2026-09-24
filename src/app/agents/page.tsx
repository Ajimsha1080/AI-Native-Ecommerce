'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import Link from 'next/link';
import { 
  Bot, Plus, Search, ArrowRight, Table as TableIcon, LayoutGrid,
  Globe, Terminal, Cpu, ArrowUpRight, Play
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { fetchWithCache, getClientCachedData } from '@/lib/client-cache';

export default function AgentsDirectoryPage() {
  const cached = getClientCachedData<{ agents: any[] }>('/api/agents');
  const [agents, setAgents] = useState<any[]>(() => cached?.agents || []);
  const [loading, setLoading] = useState(!cached);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  useEffect(() => {
    async function loadAgents() {
      try {
        const data = await fetchWithCache<{ agents: any[] }>('/api/agents');
        if (data?.agents) {
          setAgents(data.agents);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAgents();
  }, []);

  const filtered = agents.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.config?.persona?.role && a.config.persona.role.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (statusFilter === 'ALL') return matchesSearch;
    const isLive = a.status === 'ACTIVE' || a.status === 'LIVE';
    if (statusFilter === 'ACTIVE') return matchesSearch && isLive;
    if (statusFilter === 'DRAFT') return matchesSearch && !isLive;
    return matchesSearch;
  });

  return (
    <div className="flex h-screen bg-[#f4f5f7] text-zinc-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f4f5f7]">
        <Navbar />

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="max-w-7xl mx-auto space-y-5">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-4">
              <div>
                <h1 className="text-lg font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-zinc-700" />
                  AI Agents Fleet
                </h1>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Configure, test, evaluate, and monitor autonomous commerce assistants.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/agents/new"
                  className="px-4 py-2 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Agent
                </Link>
              </div>
            </div>

            {/* Controls: Search, Status Filters, View Toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search agents by name, role, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                {/* Status Segmented Control */}
                <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-xl p-0.5 text-xs">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      statusFilter === 'ALL' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    All ({agents.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('ACTIVE')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      statusFilter === 'ACTIVE' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Live
                  </button>
                  <button
                    onClick={() => setStatusFilter('DRAFT')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      statusFilter === 'DRAFT' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Draft
                  </button>
                </div>

                {/* View Switcher */}
                <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-xl p-0.5 text-xs">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg transition ${
                      viewMode === 'table' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                    title="Table View"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition ${
                      viewMode === 'grid' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Data Representation */}
            {loading ? (
              <div className="p-16 text-center text-xs text-zinc-500 font-mono">Loading fleet...</div>
            ) : filtered.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-3 shadow-xs">
                <Bot className="w-8 h-8 text-zinc-400 mx-auto" />
                <h3 className="text-sm font-bold text-zinc-900">No agents match your criteria</h3>
                <p className="text-xs text-zinc-500">
                  Try clearing your search filters or create a new commerce concierge.
                </p>
                <Link
                  href="/agents/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#18181b] text-white text-xs font-semibold shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Agent
                </Link>
              </div>
            ) : viewMode === 'table' ? (
              /* Linear-Style High Density Table */
              <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 font-semibold text-[11px]">
                      <th className="py-3 px-4 font-semibold text-zinc-700">Agent</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Version</th>
                      <th className="py-3 px-4 font-semibold">Capabilities</th>
                      <th className="py-3 px-4 font-semibold">Deployment Channel</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filtered.map((agent) => (
                      <tr key={agent.id} className="hover:bg-zinc-50/60 transition group">
                        {/* Agent Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 shrink-0 font-mono text-xs">
                              <Bot className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <Link 
                                href={`/agents/${agent.id}`} 
                                className="font-bold text-zinc-900 group-hover:text-indigo-600 transition block text-xs"
                              >
                                {agent.name}
                              </Link>
                              <span className="text-[11px] text-zinc-500 block line-clamp-1 max-w-xs">
                                {agent.config?.persona?.role || agent.description || 'Shopping Assistant'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={agent.status || 'LIVE'} size="sm" />
                        </td>

                        {/* Version */}
                        <td className="py-3.5 px-4 font-mono text-zinc-600 font-medium">
                          v{agent.version || '1.0'}
                        </td>

                        {/* Tools & RAG */}
                        <td className="py-3.5 px-4 font-mono text-zinc-600 text-[11px]">
                          15 Tools • 128-dim RAG
                        </td>

                        {/* Deployment */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 font-mono">
                            <Globe className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Embed Widget / API</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/agents/${agent.id}/playground`}
                              className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold border border-zinc-200 transition flex items-center gap-1"
                            >
                              <Play className="w-3 h-3 text-emerald-600 fill-current" /> Test
                            </Link>
                            <Link
                              href={`/agents/${agent.id}`}
                              className="px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-semibold transition flex items-center gap-1"
                            >
                              Studio <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((agent) => (
                  <div
                    key={agent.id}
                    className="bg-white border border-zinc-200 hover:border-zinc-300 transition rounded-2xl p-4.5 flex flex-col justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 font-mono text-xs">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-zinc-900">
                              {agent.name}
                            </h3>
                            <p className="text-[11px] text-zinc-500">{agent.config?.persona?.role || 'Shopping Assistant'}</p>
                          </div>
                        </div>
                        <StatusBadge status={agent.status || 'LIVE'} size="sm" />
                      </div>

                      <p className="text-xs text-zinc-500 line-clamp-2">
                        {agent.description || agent.config?.persona?.tone || 'Configured for product discovery and order tracking.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-zinc-400">v{agent.version || '1.0'}</span>
                      <div className="flex gap-1.5">
                        <Link
                          href={`/agents/${agent.id}/playground`}
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold border border-zinc-200 transition"
                        >
                          Playground
                        </Link>
                        <Link
                          href={`/agents/${agent.id}`}
                          className="px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-semibold transition flex items-center gap-1"
                        >
                          Studio <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
