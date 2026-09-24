'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import Link from 'next/link';
import { 
  CreditCard, CheckCircle2, Zap, Shield, 
  ArrowRight, Check, Loader2, Sparkles 
} from 'lucide-react';

interface BillingData {
  plan: string;
  usage: {
    messages: { used: number; limit: number; percentage: number };
    chunks: { used: number; limit: number; percentage: number };
    agents: { used: number; limit: number; percentage: number };
  };
}

export default function BillingWorkspacePage() {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    async function loadBilling() {
      try {
        const res = await fetch('/api/billing');
        if (res.ok) {
          const data = await res.json();
          setBillingData(data);
        }
      } catch (e) {
        console.error('Failed to load billing usage', e);
      } finally {
        setLoading(false);
      }
    }
    loadBilling();
  }, []);

  const handleCheckout = async (planId: string) => {
    setCheckingOut(planId);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, provider: 'STRIPE' })
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setNotification(`Plan ${planId} checkout initiated successfully.`);
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (e) {
      setNotification('Checkout initialization failed. Please try again.');
    } finally {
      setCheckingOut(null);
    }
  };

  const plans = [
    {
      id: 'STARTER',
      name: 'Starter Tier',
      price: '$49',
      period: '/ mo',
      description: 'For growing boutique stores and direct-to-consumer brands.',
      features: ['Up to 3 Active Agents', '5,000 Messages / mo', '1,000 Chunks Vector DB', 'Standard Support']
    },
    {
      id: 'GROWTH',
      name: 'Growth Scale',
      price: '$199',
      period: '/ mo',
      popular: true,
      description: 'Full multi-tool agent runtime with automated fulfillment actions.',
      features: ['Up to 15 Active Agents', '50,000 Messages / mo', '5,000 Chunks Vector DB', '15 Typed Commerce Tools', 'Priority 24/7 SLA']
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise Cloud',
      price: '$799',
      period: '/ mo',
      description: 'Dedicated LLM clusters, custom vector index, and RBAC teams.',
      features: ['Up to 100 Active Agents', '500,000 Message Volume', '50,000 Chunks Vector DB', 'Dedicated Account Architect', 'Full Audit Logging']
    }
  ];

  const currentPlan = billingData?.plan || 'GROWTH';

  return (
    <div className="flex h-screen bg-[#f4f5f7] text-zinc-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f4f5f7]">
        <Navbar />

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="border-b border-zinc-200 pb-4">
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-zinc-700" />
                Subscription &amp; Resource Usage
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Monitor live monthly message quotas, vector storage, and workspace plan tier.
              </p>
            </div>

            {notification && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 font-mono shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{notification}</span>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1.5 border-b border-zinc-200 pb-2 overflow-x-auto">
              <Link href="/settings" className="px-3 py-1.5 text-xs font-semibold rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition whitespace-nowrap">
                General
              </Link>
              <Link href="/billing" className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white text-zinc-900 border border-zinc-300 shadow-2xs whitespace-nowrap">
                Billing &amp; Quotas
              </Link>
              <Link href="/analytics" className="px-3 py-1.5 text-xs font-semibold rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition whitespace-nowrap">
                Store Analytics
              </Link>
              <Link href="/api-keys" className="px-3 py-1.5 text-xs font-semibold rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition whitespace-nowrap">
                API Keys
              </Link>
              <Link href="/team" className="px-3 py-1.5 text-xs font-semibold rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition whitespace-nowrap">
                Team Members
              </Link>
              <Link href="/security" className="px-3 py-1.5 text-xs font-semibold rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition whitespace-nowrap">
                Security &amp; RBAC
              </Link>
            </div>

            {/* Usage Quotas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 space-y-1.5 font-mono shadow-xs">
                <span className="text-[11px] uppercase text-zinc-500 font-sans font-semibold">Monthly Messages</span>
                <div className="text-xl font-bold text-zinc-900">
                  {billingData ? `${billingData.usage.messages.used.toLocaleString()} / ${billingData.usage.messages.limit.toLocaleString()}` : '—'}
                </div>
                <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300" 
                    style={{ width: `${billingData?.usage.messages.percentage || 0}%` }}
                  ></div>
                </div>
                <div className="text-[10px] text-zinc-500 text-right font-medium">{billingData?.usage.messages.percentage || 0}% used</div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 space-y-1.5 font-mono shadow-xs">
                <span className="text-[11px] uppercase text-zinc-500 font-sans font-semibold">Knowledge Chunks</span>
                <div className="text-xl font-bold text-zinc-900">
                  {billingData ? `${billingData.usage.chunks.used.toLocaleString()} / ${billingData.usage.chunks.limit.toLocaleString()}` : '—'}
                </div>
                <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300" 
                    style={{ width: `${billingData?.usage.chunks.percentage || 0}%` }}
                  ></div>
                </div>
                <div className="text-[10px] text-zinc-500 text-right font-medium">{billingData?.usage.chunks.percentage || 0}% used</div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 space-y-1.5 font-mono shadow-xs">
                <span className="text-[11px] uppercase text-zinc-500 font-sans font-semibold">Active Agents</span>
                <div className="text-xl font-bold text-zinc-900">
                  {billingData ? `${billingData.usage.agents.used} / ${billingData.usage.agents.limit}` : '—'}
                </div>
                <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300" 
                    style={{ width: `${billingData?.usage.agents.percentage || 0}%` }}
                  ></div>
                </div>
                <div className="text-[10px] text-zinc-500 text-right font-medium">{billingData?.usage.agents.percentage || 0}% used</div>
              </div>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {plans.map((p) => {
                const isCurrent = p.id === currentPlan;
                return (
                  <div
                    key={p.id}
                    className={`bg-white border rounded-2xl p-5 flex flex-col justify-between relative transition shadow-xs ${
                      isCurrent
                        ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-500'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-zinc-900">{p.name}</h3>
                          {isCurrent && (
                            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full font-mono border border-indigo-200">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{p.description}</p>
                      </div>

                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-2xl font-bold text-zinc-900">{p.price}</span>
                        <span className="text-xs text-zinc-500">{p.period}</span>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                        {p.features.map((feat, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-zinc-700">
                            <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      disabled={isCurrent || checkingOut === p.id}
                      onClick={() => handleCheckout(p.id)}
                      className={`w-full mt-5 py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 ${
                        isCurrent
                          ? 'bg-zinc-100 text-zinc-500 border border-zinc-200 cursor-default'
                          : 'bg-[#18181b] hover:bg-[#27272a] text-white cursor-pointer shadow-xs'
                      }`}
                    >
                      {checkingOut === p.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {isCurrent ? 'Active Plan' : `Upgrade to ${p.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}