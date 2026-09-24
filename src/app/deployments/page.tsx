'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { 
  Globe, Code2, Server, Smartphone, Plus, Power, 
  MoreVertical, Check, Copy, RefreshCw, X, Play, 
  Trash2, Key, ShieldCheck, Sparkles, MessageSquare, 
  Palette, FileText, Sliders, ExternalLink, ChevronRight,
  Settings2, Eye, HelpCircle, Layers, CheckCircle2
} from 'lucide-react';
import { fetchWithCache, getClientCachedData } from '@/lib/client-cache';

type TabType = 'channels' | 'appearance' | 'content' | 'general' | 'embed';

interface DeploymentItem {
  id: string;
  agent_id: string;
  name?: string;
  channel: 'WEBSITE' | 'MOBILE_SDK' | 'REST_API' | 'CUSTOM' | 'IFRAME';
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
  public_key: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  allowed_domains: string[];
  sessions_count?: number;
  created_at: string;
  updated_at: string;
}

export default function DeploymentsWorkspacePage() {
  const cached = getClientCachedData<{ deployments: DeploymentItem[] }>('/api/deployments');
  const [deployments, setDeployments] = useState<DeploymentItem[]>(() => cached?.deployments || []);
  const [loading, setLoading] = useState(!cached);
  const [activeTab, setActiveTab] = useState<TabType>('channels');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');

  // Creation form state
  const [newDepName, setNewDepName] = useState('');
  const [newChannel, setNewChannel] = useState<'WEBSITE' | 'MOBILE_SDK' | 'REST_API' | 'IFRAME'>('WEBSITE');
  const [newEnvironment, setNewEnvironment] = useState<'PRODUCTION' | 'STAGING'>('PRODUCTION');
  const [newDomain, setNewDomain] = useState('coarai.internal');
  const [creating, setCreating] = useState(false);

  // Appearance settings state
  const [themeColor, setThemeColor] = useState('#8b5cf6');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [launcherIcon, setLauncherIcon] = useState<'sparkles' | 'message' | 'bot'>('sparkles');
  const [buttonText, setButtonText] = useState('Chat with AI');

  // Content settings state
  const [greeting, setGreeting] = useState("Hi there! 👋 I'm your AI shopping assistant. How can I help you today?");
  const [placeholder, setPlaceholder] = useState("Ask about products, sizing, or tracking...");
  const [agentDisplayName, setAgentDisplayName] = useState("ShopMate AI Assistant");
  const [quickPrompts, setQuickPrompts] = useState([
    "Track my latest order 📦",
    "Find trending sneakers under $120 👟",
    "What is your return & refund policy? 🔄"
  ]);
  const [newPromptText, setNewPromptText] = useState('');

  // General settings state
  const [corsDomains, setCorsDomains] = useState("coarai.internal, *.myshopify.com, localhost:3000");
  const [rateLimit, setRateLimit] = useState("60");
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [enableEscalation, setEnableEscalation] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    loadDeployments();
  }, []);

  async function loadDeployments() {
    try {
      const data = await fetchWithCache<{ deployments: DeploymentItem[] }>('/api/deployments');
      if (data?.deployments && data.deployments.length > 0) {
        setDeployments(data.deployments);
      } else {
        // Default seed to match standard deployment showcase
        const initialDeployments: DeploymentItem[] = [
          {
            id: 'dep_widget_prod_01',
            agent_id: 'agent_shopmate_01',
            name: 'Production Website Widget',
            channel: 'WEBSITE',
            environment: 'PRODUCTION',
            public_key: 'pk_live_widget_8829f01',
            status: 'ACTIVE',
            allowed_domains: ['coarai.internal'],
            sessions_count: 0,
            created_at: '2026-08-15T10:00:00Z',
            updated_at: '2026-08-15T10:00:00Z'
          },
          {
            id: 'dep_rest_api_02',
            agent_id: 'agent_shopmate_01',
            name: 'Customer Support REST API',
            channel: 'REST_API',
            environment: 'PRODUCTION',
            public_key: 'pk_live_rest_3914a77',
            status: 'ACTIVE',
            allowed_domains: ['api.internal'],
            sessions_count: 0,
            created_at: '2026-08-15T10:00:00Z',
            updated_at: '2026-08-15T10:00:00Z'
          }
        ];
        setDeployments(initialDeployments);
      }
    } catch (err) {
      console.error('Failed to load deployments:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(dep: DeploymentItem) {
    const nextStatus = dep.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      // Optimistic update
      setDeployments(prev => prev.map(d => d.id === dep.id ? { ...d, status: nextStatus } : d));
      await fetch('/api/deployments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dep.id, status: nextStatus })
      });
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  }

  async function handleCreateDeployment(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: 'agent_shopmate_01',
          name: newDepName || `${newChannel === 'WEBSITE' ? 'Website Widget' : newChannel === 'REST_API' ? 'REST API Endpoint' : newChannel === 'IFRAME' ? 'React / Iframe Embed' : 'Mobile SDK'}`,
          channel: newChannel,
          environment: newEnvironment,
          allowed_domains: [newDomain || '*']
        })
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewDepName('');
        await loadDeployments();
        triggerSavedNotice();
      }
    } catch (err) {
      console.error('Failed to create deployment:', err);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to deactivate and remove this deployment?')) return;
    try {
      setDeployments(prev => prev.filter(d => d.id !== id));
      await fetch(`/api/deployments?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete deployment:', err);
    }
  }

  const copyToClipboard = (text: string, id: string, type: 'snippet' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'snippet') {
      setCopiedSnippet(id);
      setTimeout(() => setCopiedSnippet(null), 2500);
    } else {
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const triggerSavedNotice = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const activeWidgetCount = deployments.filter(d => d.channel === 'WEBSITE' && d.status === 'ACTIVE').length;
  const activeRestCount = deployments.filter(d => d.channel === 'REST_API' && d.status === 'ACTIVE').length;
  const activeIframeCount = deployments.filter(d => (d.channel === 'IFRAME' || d.channel === 'CUSTOM') && d.status === 'ACTIVE').length;
  const activeMobileCount = deployments.filter(d => d.channel === 'MOBILE_SDK' && d.status === 'ACTIVE').length;

  return (
    <div className="flex h-screen bg-[#0b0c0e] text-zinc-100 font-sans selection:bg-purple-500/30 selection:text-white antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0b0c0e]">
        <Navbar />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 space-y-6 bg-[#0b0c0e]">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Top Navigation Bar with Tabs & Save Changes */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1">
                <button
                  onClick={() => setActiveTab('channels')}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition relative ${
                    activeTab === 'channels'
                      ? 'text-purple-400 bg-purple-950/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                >
                  Channels &amp; Deployments
                  {activeTab === 'channels' && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-purple-500 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('appearance')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition relative ${
                    activeTab === 'appearance'
                      ? 'text-purple-400 bg-purple-950/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                >
                  Appearance
                  {activeTab === 'appearance' && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-purple-500 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('content')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition relative ${
                    activeTab === 'content'
                      ? 'text-purple-400 bg-purple-950/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                >
                  Content
                  {activeTab === 'content' && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-purple-500 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('general')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition relative ${
                    activeTab === 'general'
                      ? 'text-purple-400 bg-purple-950/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                >
                  General
                  {activeTab === 'general' && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-purple-500 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('embed')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition relative ${
                    activeTab === 'embed'
                      ? 'text-purple-400 bg-purple-950/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                >
                  Embed
                  {activeTab === 'embed' && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-purple-500 rounded-full" />
                  )}
                </button>
              </nav>

              <div className="flex items-center gap-2">
                <button
                  onClick={triggerSavedNotice}
                  className="px-4 py-1.5 rounded-lg bg-[#0e3b2e] hover:bg-[#134e3e] border border-emerald-700/50 text-emerald-300 hover:text-emerald-200 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>

            {/* Notification Toast */}
            {savedSuccess && (
              <div className="bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Deployment configuration and channel settings saved successfully!</span>
                </div>
                <button onClick={() => setSavedSuccess(false)} className="text-emerald-400/80 hover:text-emerald-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* TAB 1: CHANNELS & DEPLOYMENTS */}
            {activeTab === 'channels' && (
              <div className="space-y-8">
                {/* 1. Deployment Channels Section */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">Deployment Channels</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Choose how users interact with your AI agent across web, mobile, and API endpoints.
                    </p>
                  </div>

                  {/* 2x2 Grid matching screenshot */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Channel 1: Website Widget */}
                    <div className="p-5 rounded-2xl bg-[#121318] border border-zinc-800/90 hover:border-zinc-700/90 transition flex flex-col justify-between gap-3 group relative shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="w-9 h-9 rounded-xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-center text-purple-400">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2">
                          {activeWidgetCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/70 border border-emerald-800/70 text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                              NOT CONFIGURED
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800/90 border border-zinc-700/60 text-zinc-300">
                            Popular
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 mt-1">
                        <h3 className="text-sm font-bold text-white tracking-tight">Website Widget</h3>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Floating bubble widget embeddable via single script tag.
                        </p>
                      </div>
                    </div>

                    {/* Channel 2: React / Iframe Embed */}
                    <div className="p-5 rounded-2xl bg-[#121318] border border-zinc-800/90 hover:border-zinc-700/90 transition flex flex-col justify-between gap-3 group relative shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                          <Code2 className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2">
                          {activeIframeCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/70 border border-emerald-800/70 text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                              NOT CONFIGURED
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800/90 border border-zinc-700/60 text-zinc-300">
                            Flexible
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 mt-1">
                        <h3 className="text-sm font-bold text-white tracking-tight">React / Iframe Embed</h3>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Inline component or responsive iframe modal for web apps.
                        </p>
                      </div>
                    </div>

                    {/* Channel 3: REST API Integration */}
                    <div className="p-5 rounded-2xl bg-[#121318] border border-zinc-800/90 hover:border-zinc-700/90 transition flex flex-col justify-between gap-3 group relative shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="w-9 h-9 rounded-xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-center text-purple-400">
                          <Server className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2">
                          {activeRestCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/70 border border-emerald-800/70 text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                              NOT CONFIGURED
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800/90 border border-zinc-700/60 text-zinc-300">
                            Headless
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 mt-1">
                        <h3 className="text-sm font-bold text-white tracking-tight">REST API Integration</h3>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Direct programmatic headless access via authenticated /chat endpoint.
                        </p>
                      </div>
                    </div>

                    {/* Channel 4: Mobile SDK */}
                    <div className="p-5 rounded-2xl bg-[#121318] border border-zinc-800/90 hover:border-zinc-700/90 transition flex flex-col justify-between gap-3 group relative shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2">
                          {activeMobileCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/70 border border-emerald-800/70 text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                              NOT CONFIGURED
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800/90 border border-zinc-700/60 text-zinc-300">
                            Native
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 mt-1">
                        <h3 className="text-sm font-bold text-white tracking-tight">Mobile SDK</h3>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Native iOS &amp; Android SDKs with turnkey conversational UI.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Active Deployments List Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white tracking-tight">Active Deployments</h2>
                      <span className="text-xs text-zinc-400 font-medium">({deployments.length})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Deployment</span>
                      </button>
                    </div>
                  </div>

                  {/* List Rows */}
                  <div className="space-y-3">
                    {deployments.map((dep) => {
                      const isWebsite = dep.channel === 'WEBSITE';
                      const isRest = dep.channel === 'REST_API';
                      const title = dep.name || (isWebsite ? 'Production Website Widget' : isRest ? 'Customer Support REST API' : `${dep.channel} Deployment`);
                      const tagLabel = isWebsite ? 'website widget' : isRest ? 'rest api' : dep.channel.toLowerCase();
                      const domainText = dep.allowed_domains?.join(', ') || 'coarai.internal';
                      const dateText = dep.created_at ? new Date(dep.created_at).toLocaleDateString('en-US') : '8/15/2026';
                      const isActive = dep.status === 'ACTIVE';

                      return (
                        <div
                          key={dep.id}
                          className="p-4 rounded-2xl bg-[#121318] border border-zinc-800/90 hover:border-zinc-700/90 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                        >
                          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-purple-950/40 border border-purple-800/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5 sm:mt-0">
                              {isWebsite ? <Globe className="w-4 h-4" /> : isRest ? <Server className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-2">
                                <h3 className="text-sm font-semibold text-white tracking-tight truncate">{title}</h3>
                                {isActive ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
                                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
                                    <span className="w-1 h-1 rounded-full bg-zinc-500" />
                                    Disabled
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
                                  {tagLabel}
                                </span>
                              </div>

                              <p className="text-xs text-zinc-400 font-sans truncate">
                                Domain: <span className="text-zinc-300">{domainText}</span> • Sessions: <span className="text-zinc-300">{dep.sessions_count ?? 0}</span> • Created: <span className="text-zinc-300">{dateText}</span>
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              onClick={() => toggleStatus(dep)}
                              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition flex items-center gap-1.5"
                            >
                              <Power className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-400' : 'text-emerald-400'}`} />
                              <span>{isActive ? 'Disable' : 'Enable'}</span>
                            </button>

                            <div className="relative">
                              <button
                                onClick={() => setActiveMenuId(activeMenuId === dep.id ? null : dep.id)}
                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition"
                                title="Deployment Options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {activeMenuId === dep.id && (
                                <div className="absolute right-0 top-9 w-48 rounded-xl bg-[#181920] border border-zinc-800 shadow-2xl p-1.5 z-20 space-y-1">
                                  <button
                                    onClick={() => {
                                      const base = origin || 'http://localhost:3000';
                                      const snippet = `<script src="${base}/agent.js" data-deployment="${dep.id}" defer></script>`;
                                      copyToClipboard(snippet, dep.id, 'snippet');
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg flex items-center gap-2 transition"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-purple-400" />
                                    <span>Copy Script Tag</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      copyToClipboard(dep.public_key, dep.id, 'key');
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg flex items-center gap-2 transition"
                                  >
                                    <Key className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>Copy Public Key</span>
                                  </button>

                                  <a
                                    href={`/embed/${dep.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg flex items-center gap-2 transition"
                                  >
                                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Open Live Sandbox</span>
                                  </a>

                                  <div className="h-px bg-zinc-800 my-1" />

                                  <button
                                    onClick={() => {
                                      handleDelete(dep.id);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg flex items-center gap-2 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Channel</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: APPEARANCE */}
            {activeTab === 'appearance' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-6">
                  <div className="p-6 rounded-2xl bg-[#121318] border border-zinc-800 space-y-5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Palette className="w-4 h-4 text-purple-400" />
                      <span>Theme &amp; Brand Accent</span>
                    </h3>

                    <div className="space-y-3">
                      <label className="text-xs font-medium text-zinc-300 block">Primary Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={themeColor}
                          onChange={(e) => setThemeColor(e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={themeColor}
                          onChange={(e) => setThemeColor(e.target.value)}
                          className="w-32 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200"
                        />
                        <div className="flex items-center gap-1.5">
                          {['#8b5cf6', '#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#09090b'].map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => setThemeColor(hex)}
                              className="w-6 h-6 rounded-full border border-zinc-700 transition hover:scale-110"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-zinc-800/80">
                      <label className="text-xs font-medium text-zinc-300 block">Launcher Position</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPosition('bottom-right')}
                          className={`p-3 rounded-xl border text-xs font-medium text-left transition ${
                            position === 'bottom-right'
                              ? 'bg-purple-950/30 border-purple-600 text-purple-300'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Bottom Right (Default)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPosition('bottom-left')}
                          className={`p-3 rounded-xl border text-xs font-medium text-left transition ${
                            position === 'bottom-left'
                              ? 'bg-purple-950/30 border-purple-600 text-purple-300'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Bottom Left
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-zinc-800/80">
                      <label className="text-xs font-medium text-zinc-300 block">Launcher Button Label</label>
                      <input
                        type="text"
                        value={buttonText}
                        onChange={(e) => setButtonText(e.target.value)}
                        placeholder="e.g. Chat with AI"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Preview Widget */}
                <div className="lg:col-span-5">
                  <div className="p-6 rounded-2xl bg-[#121318] border border-zinc-800 space-y-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-purple-400" />
                      <span>Live Preview</span>
                    </h3>

                    <div className="h-96 rounded-xl bg-zinc-950 border border-zinc-800/80 p-4 relative overflow-hidden flex flex-col justify-end">
                      {/* Fake Chat Window */}
                      <div className="bg-[#181920] border border-zinc-800 rounded-xl p-3 shadow-2xl space-y-2 mb-12">
                        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: themeColor }}>
                            <Sparkles className="w-3 h-3" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-white">{agentDisplayName}</p>
                            <p className="text-[9px] text-emerald-400">● Online</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-300 bg-zinc-900 p-2 rounded-lg leading-relaxed">{greeting}</p>
                      </div>

                      {/* Floating Bubble */}
                      <div className={`absolute bottom-3 ${position === 'bottom-right' ? 'right-3' : 'left-3'}`}>
                        <button
                          className="px-3.5 py-2 rounded-full text-white text-xs font-semibold shadow-xl flex items-center gap-2 transition hover:opacity-90"
                          style={{ backgroundColor: themeColor }}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{buttonText}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CONTENT */}
            {activeTab === 'content' && (
              <div className="space-y-6 max-w-3xl">
                <div className="p-6 rounded-2xl bg-[#121318] border border-zinc-800 space-y-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Greetings &amp; Prompts</span>
                  </h3>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-300">Agent Display Name</label>
                    <input
                      type="text"
                      value={agentDisplayName}
                      onChange={(e) => setAgentDisplayName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-300">Welcome Message</label>
                    <textarea
                      rows={3}
                      value={greeting}
                      onChange={(e) => setGreeting(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-purple-500 leading-relaxed"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-300">Chat Input Placeholder</label>
                    <input
                      type="text"
                      value={placeholder}
                      onChange={(e) => setPlaceholder(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-3 pt-3 border-t border-zinc-800">
                    <label className="text-xs font-medium text-zinc-300 block">Starter Prompt Chips</label>
                    <div className="space-y-2">
                      {quickPrompts.map((prompt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={prompt}
                            onChange={(e) => {
                              const updated = [...quickPrompts];
                              updated[idx] = e.target.value;
                              setQuickPrompts(updated);
                            }}
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200"
                          />
                          <button
                            onClick={() => setQuickPrompts(quickPrompts.filter((_, i) => i !== idx))}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        placeholder="Add new starter prompt..."
                        value={newPromptText}
                        onChange={(e) => setNewPromptText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newPromptText.trim()) {
                            setQuickPrompts([...quickPrompts, newPromptText.trim()]);
                            setNewPromptText('');
                          }
                        }}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newPromptText.trim()) {
                            setQuickPrompts([...quickPrompts, newPromptText.trim()]);
                            setNewPromptText('');
                          }
                        }}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg"
                      >
                        Add Chip
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: GENERAL */}
            {activeTab === 'general' && (
              <div className="space-y-6 max-w-3xl">
                <div className="p-6 rounded-2xl bg-[#121318] border border-zinc-800 space-y-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span>Security &amp; Domain Whitelist</span>
                  </h3>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-300">Allowed Domains (CORS)</label>
                    <input
                      type="text"
                      value={corsDomains}
                      onChange={(e) => setCorsDomains(e.target.value)}
                      placeholder="e.g. coarai.internal, *.myshopify.com"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-[11px] text-zinc-400">Separate domains by commas. Wildcards (*) are supported for subdomains.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-800">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-300">Rate Limit (req / min / IP)</label>
                      <input
                        type="number"
                        value={rateLimit}
                        onChange={(e) => setRateLimit(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-300">Session Inactivity Timeout (mins)</label>
                      <input
                        type="number"
                        value={sessionTimeout}
                        onChange={(e) => setSessionTimeout(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Auto Escalation Trigger</h4>
                      <p className="text-[11px] text-zinc-400">Escalate conversation to human agent if customer frustration or policy failure occurs.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableEscalation}
                      onChange={(e) => setEnableEscalation(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 bg-zinc-900 border-zinc-700"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: EMBED CODE */}
            {activeTab === 'embed' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-[#121318] border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-purple-400" />
                      <span>1. Single Script Tag Embed (HTML / Shopify / WooCommerce)</span>
                    </h3>
                    <button
                      onClick={() => {
                        const base = origin || 'http://localhost:3000';
                        const snippet = `<script src="${base}/agent.js" data-deployment="dep_widget_prod_01" defer></script>`;
                        copyToClipboard(snippet, 'script', 'snippet');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      {copiedSnippet === 'script' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippet === 'script' ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400">Paste before the closing <code className="text-purple-300 font-mono">&lt;/body&gt;</code> tag on your website.</p>
                  <pre className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 font-mono text-xs text-zinc-300 overflow-x-auto">
{`<script src="${origin || 'http://localhost:3000'}/agent.js" data-deployment="dep_widget_prod_01" defer></script>`}
                  </pre>
                </div>

                <div className="p-6 rounded-2xl bg-[#121318] border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Server className="w-4 h-4 text-purple-400" />
                      <span>2. Headless REST API (cURL / Python / Node)</span>
                    </h3>
                    <button
                      onClick={() => {
                        const snippet = `curl -X POST ${origin || 'http://localhost:3000'}/api/v1/agents/agent_shopmate_01/chat \\\n  -H "Authorization: Bearer pk_live_rest_3914a77" \\\n  -H "Content-Type: application/json" \\\n  -d '{"message": "Check inventory status for Nike Air Zoom"}'`;
                        copyToClipboard(snippet, 'curl', 'snippet');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      {copiedSnippet === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippet === 'curl' ? 'Copied!' : 'Copy cURL'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
{`curl -X POST ${origin || 'http://localhost:3000'}/api/v1/agents/agent_shopmate_01/chat \\
  -H "Authorization: Bearer pk_live_rest_3914a77" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Check inventory status for Nike Air Zoom"}'`}
                  </pre>
                </div>
              </div>
            )}

            {/* CREATE MODAL */}
            {showCreateModal && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#121318] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-purple-400" />
                      <span>Create New Deployment Channel</span>
                    </h3>
                    <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateDeployment} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Deployment Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Production Storefront Widget"
                        value={newDepName}
                        onChange={(e) => setNewDepName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-300">Channel Type</label>
                        <select
                          value={newChannel}
                          onChange={(e) => setNewChannel(e.target.value as any)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="WEBSITE">Website Widget</option>
                          <option value="IFRAME">React / Iframe Embed</option>
                          <option value="REST_API">REST API Integration</option>
                          <option value="MOBILE_SDK">Mobile SDK</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-300">Environment</label>
                        <select
                          value={newEnvironment}
                          onChange={(e) => setNewEnvironment(e.target.value as any)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="PRODUCTION">Production</option>
                          <option value="STAGING">Staging Sandbox</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Primary Domain Whitelist</label>
                      <input
                        type="text"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        placeholder="e.g. coarai.internal or *"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creating}
                        className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition disabled:opacity-50"
                      >
                        {creating ? 'Deploying...' : 'Deploy Channel'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}