'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Bot, ShoppingBag, ShieldCheck, ArrowRight, Zap, 
  Layers, Database, BarChart3, Rocket, MessageSquare, CheckCircle2, 
  ChevronRight, Terminal, Truck, RotateCcw, Cpu, Check, Star, 
  ExternalLink, Code2, Globe2, ShieldAlert, Play, ArrowUpRight,
  Search, Sliders, CheckCircle, Lock, Server, Sparkles, LayoutDashboard
} from 'lucide-react';
import PortalSwitcher from '@/components/layout/PortalSwitcher';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'search' | 'tracking' | 'returns'>('search');
  const [cartCount, setCartCount] = useState(1);
  const [addedItem, setAddedItem] = useState<string | null>(null);

  // ROI calculator state
  const [monthlyOrders, setMonthlyOrders] = useState(10000);
  const [supportCostPerTicket, setSupportCostPerTicket] = useState(6.5);

  const estimatedInquiries = Math.round(monthlyOrders * 0.35);
  const estimatedSavings = Math.round(estimatedInquiries * 0.72 * supportCostPerTicket);
  const conversionUpliftRevenue = Math.round(monthlyOrders * 0.08 * 145);

  const handleAddToCart = (productName: string) => {
    setAddedItem(productName);
    setCartCount(prev => prev + 1);
    setTimeout(() => setAddedItem(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-700 selection:text-white flex flex-col font-sans relative antialiased">
      {/* Subtle Micro-Grid */}
      <div className="absolute inset-0 b2b-grid-pattern opacity-60 pointer-events-none -z-10"></div>

      {/* Navigation */}
      <header className="border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-200">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                ShopMate
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                AaaS
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400">
            <a href="#simulator" className="hover:text-zinc-200 transition">Runtime Preview</a>
            <a href="#specs" className="hover:text-zinc-200 transition">Architecture</a>
            <a href="#tools" className="hover:text-zinc-200 transition">Commerce APIs</a>
            <a href="#roi" className="hover:text-zinc-200 transition">ROI Model</a>
          </nav>

          <div className="flex items-center gap-3">
            <PortalSwitcher />
            <Link 
              href="/auth/login"
              className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-800 rounded-lg transition"
            >
              Sign In
            </Link>
            <Link 
              href="/dashboard"
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-200 rounded-lg transition flex items-center gap-1.5"
            >
              Console <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="pt-20 pb-16 px-6 max-w-5xl mx-auto space-y-6 text-center">
          
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Version 2.4 Production Engine</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">128-dim Cosine RAG + 15 Typed Tools</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1] max-w-4xl mx-auto">
            The Autonomous Agent Runtime for Modern E-Commerce
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Build, test, evaluate, and deploy production commerce concierges. Query live inventory, track shipments, calculate return eligibility, and execute verified store actions with zero hallucinations.
          </p>

          {/* 3 Main UI Launch Cards */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl mx-auto text-left">
            {/* UI 1: Merchant Console */}
            <Link 
              href="/dashboard"
              className="p-4 rounded-xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-700/80 hover:border-zinc-400 hover:shadow-lg transition group flex flex-col justify-between gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400">
                  MAIN UI 1
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1">
                  Merchant Console <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  B2B dashboard, 12-stage RAG engine, agent playground, and store analytics.
                </p>
              </div>
            </Link>

            {/* UI 2: Customer Storefront Widget */}
            <Link 
              href="/embed/dep_live_widget_01"
              target="_blank"
              className="p-4 rounded-xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-700/80 hover:border-zinc-400 hover:shadow-lg transition group flex flex-col justify-between gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-400">
                  MAIN UI 2
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1">
                  Customer Storefront <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Live customer store widget with catalog shopping, sizing help, and order tracking.
                </p>
              </div>
            </Link>

            {/* UI 3: SuperAdmin Portal */}
            <Link 
              href="/admin"
              className="p-4 rounded-xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-700/80 hover:border-zinc-400 hover:shadow-lg transition group flex flex-col justify-between gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-400">
                  MAIN UI 3
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1">
                  SuperAdmin Portal <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Multi-tenant workspace operations, DB telemetry, audit logs, and security controls.
                </p>
              </div>
            </Link>
          </div>

          {/* Hard Technical Specs Bar */}
          <div className="pt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <span className="text-[11px] font-mono text-zinc-500 uppercase block">RAG Retrieval</span>
              <p className="text-xl font-bold text-white font-mono mt-1">&lt; 85 ms</p>
              <span className="text-[11px] text-zinc-400">128-dim dense cosine</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <span className="text-[11px] font-mono text-zinc-500 uppercase block">Containment</span>
              <p className="text-xl font-bold text-emerald-400 font-mono mt-1">91.4%</p>
              <span className="text-[11px] text-zinc-400">Autonomous resolution</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <span className="text-[11px] font-mono text-zinc-500 uppercase block">Tool Execution</span>
              <p className="text-xl font-bold text-white font-mono mt-1">15 APIs</p>
              <span className="text-[11px] text-zinc-400">Typed &amp; policy gated</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <span className="text-[11px] font-mono text-zinc-500 uppercase block">Database Storage</span>
              <p className="text-xl font-bold text-white font-mono mt-1">ACID JSON</p>
              <span className="text-[11px] text-zinc-400">Tenant-isolated index</span>
            </div>
          </div>
        </section>

        {/* Live Interactive Simulator */}
        <section id="simulator" className="py-12 px-6 max-w-6xl mx-auto">
          <div className="bg-[#121215] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
            
            {/* Window Topbar */}
            <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 mr-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
                </div>
                <span className="text-xs font-mono text-zinc-400">agent_runtime_preview.tsx</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400">
                  LIVE
                </span>
              </div>

              {/* Scenario Toggles */}
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs">
                <button
                  onClick={() => setActiveTab('search')}
                  className={`px-3 py-1 rounded font-medium transition ${
                    activeTab === 'search' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Product Search
                </button>
                <button
                  onClick={() => setActiveTab('tracking')}
                  className={`px-3 py-1 rounded font-medium transition ${
                    activeTab === 'tracking' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Order Tracking
                </button>
                <button
                  onClick={() => setActiveTab('returns')}
                  className={`px-3 py-1 rounded font-medium transition ${
                    activeTab === 'returns' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Return Eligibility
                </button>
              </div>
            </div>

            {/* Split Screen: Left Chat vs Right Runtime Trace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
              
              {/* Left (7 cols): Customer Chat & Product Output */}
              <div className="lg:col-span-7 p-6 space-y-4 bg-zinc-950/40">
                {/* User query */}
                <div className="flex items-start gap-3 justify-end">
                  <div className="bg-zinc-800 text-zinc-100 rounded-lg px-3.5 py-2 text-xs font-normal max-w-sm">
                    {activeTab === 'search' && "Find black running shoes under $160 in size 9."}
                    {activeTab === 'tracking' && "Where is order #10482?"}
                    {activeTab === 'returns' && "Can I return an item purchased 10 days ago?"}
                  </div>
                </div>

                {/* Assistant response */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 text-xs font-mono shrink-0 mt-0.5">
                    AI
                  </div>
                  <div className="space-y-3 flex-1 max-w-md">
                    <div className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg p-3.5 text-xs leading-relaxed space-y-2">
                      {activeTab === 'search' && (
                        <>
                          <p>Found 1 exact match in catalog inventory matching size 9 and budget &le; $160:</p>
                          <p className="text-emerald-400 font-mono text-[11px]">✓ In stock (West Coast fulfillment center)</p>
                        </>
                      )}
                      {activeTab === 'tracking' && (
                        <>
                          <p>Status for order <strong>#10482</strong>:</p>
                          <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] space-y-1 text-zinc-300">
                            <div>Carrier: <span className="text-white font-semibold">FedEx Express</span></div>
                            <div>Tracking: <span className="text-zinc-400">FEDEX-982341209384</span></div>
                            <div>Status: <span className="text-emerald-400 font-bold">DELIVERED</span> (Front Porch)</div>
                          </div>
                        </>
                      )}
                      {activeTab === 'returns' && (
                        <>
                          <p>Yes. Store policy permits returns within <strong>30 days of delivery</strong> for items in original condition with tags attached.</p>
                          <p className="text-zinc-400">Prepaid return shipping labels are generated automatically.</p>
                        </>
                      )}
                    </div>

                    {/* Interactive Product Card */}
                    {activeTab === 'search' && (
                      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0">
                            <img 
                              src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=160&auto=format&fit=crop&q=80" 
                              alt="AeroPulse Velocity" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">AeroPulse Velocity (Size 9)</p>
                            <p className="text-xs font-mono text-zinc-400">$149.99</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddToCart('AeroPulse Velocity')}
                          className="px-3 py-1.5 bg-white hover:bg-zinc-200 text-zinc-950 rounded text-xs font-semibold transition flex items-center gap-1"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          {addedItem === 'AeroPulse Velocity' ? 'Added' : 'Add to Cart'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right (5 cols): Structured Execution Trace */}
              <div className="lg:col-span-5 p-5 bg-[#0e0e11] font-mono text-[11px] space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2 text-zinc-500">
                  <span className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                    <Terminal className="w-3.5 h-3.5 text-zinc-400" /> Execution Trace
                  </span>
                  <span className="text-emerald-400">238ms • 0 hallucinations</span>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded bg-zinc-900/90 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">1. Intent Classification</span>
                    <span className="text-zinc-200">
                      {activeTab === 'search' && 'PRODUCT_SEARCH (conf: 0.992)'}
                      {activeTab === 'tracking' && 'ORDER_TRACKING (conf: 0.989)'}
                      {activeTab === 'returns' && 'RETURN_POLICY (conf: 0.995)'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-zinc-900/90 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">2. 128-dim Vector Search</span>
                    <span className="text-zinc-300">cosine_match(query, catalog_index) = 0.884</span>
                  </div>

                  <div className="p-2.5 rounded bg-zinc-900/90 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">3. Gated Tool Invocation</span>
                    <span className="text-emerald-400">
                      {activeTab === 'search' && 'product_search({ max_price: 160, size: "9" })'}
                      {activeTab === 'tracking' && 'order_lookup({ order_number: "#10482" })'}
                      {activeTab === 'returns' && 'check_return_eligibility({ window_days: 30 })'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-zinc-900/90 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">4. Grounding Gate</span>
                    <span className="text-zinc-400">Verified against ACID tenant schema. Grounded: PASSED</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Architecture Specs */}
        <section id="specs" className="py-16 px-6 max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Architecture</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Enterprise Agent Infrastructure
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">128-dim Vector Retrieval</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Dense normalized n-gram embeddings indexing store documents, warranties, and FAQs with sub-100ms cosine similarity.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">15 Typed Commerce Tools</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Permission-gated actions for catalog lookups, live inventory verification, cart manipulation, and human operator handoff.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                <Globe2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Multi-Channel Deployment</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Drop-in &lt;script&gt; widget for Shopify/WooCommerce stores, sandboxed iframe endpoints, and authenticated REST APIs.
              </p>
            </div>
          </div>
        </section>

        {/* ROI Calculator */}
        <section id="roi" className="py-16 px-6 bg-zinc-950/80 border-t border-zinc-800">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Deflection &amp; Revenue Model</h2>
              <p className="text-xs text-zinc-400">Calculate estimated support ticket deflection and assisted conversion revenue.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900/60 border border-zinc-800 p-6 rounded-xl">
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-zinc-400">Monthly Store Orders</span>
                    <span className="text-white font-mono">{monthlyOrders.toLocaleString('en-US')}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1000" 
                    max="100000" 
                    step="1000"
                    value={monthlyOrders} 
                    onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                    className="w-full accent-white cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-zinc-400">Cost per Human Support Ticket</span>
                    <span className="text-white font-mono">${supportCostPerTicket.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="3.0" 
                    max="15.0" 
                    step="0.5"
                    value={supportCostPerTicket} 
                    onChange={(e) => setSupportCostPerTicket(Number(e.target.value))}
                    className="w-full accent-white cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-center space-y-1">
                  <span className="text-[11px] font-mono text-zinc-500 uppercase block">Monthly Savings</span>
                  <p className="text-2xl font-bold text-emerald-400 font-mono">${estimatedSavings.toLocaleString('en-US')}</p>
                  <span className="text-[10px] text-zinc-500">72% AI containment</span>
                </div>

                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-center space-y-1">
                  <span className="text-[11px] font-mono text-zinc-500 uppercase block">Assisted GMV</span>
                  <p className="text-2xl font-bold text-white font-mono">${conversionUpliftRevenue.toLocaleString('en-US')}</p>
                  <span className="text-[10px] text-zinc-500">+8% conversion lift</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-[#09090b] py-6 px-6 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>All systems normal • SLA 99.98%</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-zinc-300 transition">Console</Link>
            <Link href="/agents" className="hover:text-zinc-300 transition">Agents</Link>
            <Link href="/admin" className="hover:text-zinc-300 transition">SuperAdmin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
