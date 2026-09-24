'use client';

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { 
  Puzzle, ShoppingCart, RefreshCw, CheckCircle2, 
  ExternalLink, Layers, ArrowRight, ShieldCheck, Settings, X, Send, Key, Globe, Lock
} from 'lucide-react';

export default function IntegrationsWorkspacePage() {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<any | null>(null);

  const integrations = [
    {
      id: 'local_catalog',
      name: 'Direct Store Catalog & Live Orders',
      type: 'ACID DATABASE',
      status: 'CONNECTED',
      description: 'Native high-performance database connector with real-time stock levels and shipping carrier tracking.',
      icon: ShoppingCart,
      badge: 'Connected',
      config: {
        host: 'sqlite:///data/shopmate-db.json',
        poolSize: '20 concurrent connections',
        isolationLevel: 'SERIALIZABLE (Strict Tenant Isolation)',
        syncMode: 'Live Real-time Atomic Updates'
      }
    },
    {
      id: 'shopify_storefront',
      name: 'Shopify Storefront & Admin API',
      type: 'SHOPIFY CONNECTOR',
      status: 'CONNECTED',
      description: 'Bi-directional sync for product variants, discounts, inventory levels, and live checkout links.',
      icon: ShoppingCart,
      badge: 'Ready',
      config: {
        storeDomain: 'shopmate-enterprise.myshopify.com',
        apiVersion: '2026-01 (Latest)',
        scopes: 'read_products, write_inventory, read_orders, write_checkouts',
        webhookSecret: 'shpss_live_920f81bc92a8'
      }
    },
    {
      id: 'woocommerce',
      name: 'WooCommerce REST API',
      type: 'WOOCOMMERCE REST',
      status: 'CONNECTED',
      description: 'Sync WordPress / WooCommerce products, coupon rules, customer order statuses, and tax rates.',
      icon: ShoppingCart,
      badge: 'Ready',
      config: {
        restEndpoint: 'https://store.acme-corp.com/wp-json/wc/v3',
        authMethod: 'OAuth 1.0a HMAC-SHA256',
        consumerKey: 'ck_98f12a88390b1c',
        autoSyncInterval: 'Every 5 minutes'
      }
    },
    {
      id: 'custom_webhooks',
      name: 'Outbound Commerce Webhooks',
      type: 'HMAC-SHA256 SIGNED',
      status: 'ACTIVE',
      description: 'Signed event dispatching on order lookup, return creation, and high-risk customer actions.',
      icon: Puzzle,
      badge: 'Active',
      config: {
        deliveryEndpoint: 'https://api.acme-corp.com/webhooks/shopmate',
        signingAlgorithm: 'HMAC-SHA256',
        retryPolicy: 'Exponential backoff (3 attempts)',
        eventTopics: 'order.lookup, return.created, cart.updated, handoff.triggered'
      }
    }
  ];

  async function handleSync(id: string) {
    setSyncing(id);
    try {
      const res = await fetch('/api/commerce/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: id })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || `Successfully synchronized records for ${id}!`);
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#09090b]">
        <Navbar />

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#09090b]">
          <div className="max-w-6xl mx-auto space-y-5">
            <div className="border-b border-zinc-800 pb-4">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-zinc-400" />
                Store Integrations &amp; Connectors
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Connect your e-commerce platforms, order management systems, inventory feeds, and webhook listeners.
              </p>
            </div>

            {successMsg && (
              <div className="p-3.5 bg-emerald-950/80 border border-emerald-700 rounded-xl text-xs text-emerald-200 flex items-center gap-2 font-mono shadow-lg animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="bg-[#121215] border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition flex flex-col justify-between gap-4 shadow-sm group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-zinc-850 border border-zinc-700 flex items-center justify-center text-zinc-200 group-hover:scale-105 transition-transform">
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">{item.name}</h3>
                            <p className="text-[10px] text-zinc-500 font-mono">{item.type}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 font-semibold">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-zinc-800 flex items-center justify-between font-mono text-[11px]">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveModal(item)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1"
                        >
                          <Settings className="w-3 h-3" /> Config
                        </button>
                        <button
                          onClick={() => handleSync(item.id)}
                          disabled={syncing === item.id}
                          className="px-3 py-1 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${syncing === item.id ? 'animate-spin' : ''}`} />
                          {syncing === item.id ? 'Syncing...' : 'Sync Catalog'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Integration Config Modal */}
        {activeModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#121215] border border-zinc-800 text-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <activeModal.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{activeModal.name}</h3>
                    <p className="text-[11px] text-zinc-400 font-mono">{activeModal.type}</p>
                  </div>
                </div>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-3 font-mono text-xs">
                  {Object.entries(activeModal.config || {}).map(([k, v]) => (
                    <div key={k} className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-1">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-zinc-200 text-xs break-all">{String(v)}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Connector authenticated with 100% active status.</span>
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleSync(activeModal.id);
                    setActiveModal(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Trigger Live Sync
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}