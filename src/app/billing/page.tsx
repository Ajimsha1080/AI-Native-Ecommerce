'use client';

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import Link from 'next/link';
import { 
  CreditCard, CheckCircle2, Zap, Shield, 
  ArrowRight, Check 
} from 'lucide-react';

export default function BillingWorkspacePage() {
  const [selectedPlan, setSelectedPlan] = useState('GROWTH');
  const [upgraded, setUpgraded] = useState(false);

  const plans = [
    {
      id: 'STARTER',
      name: 'Starter Tier',
      price: '$49',
      period: '/ mo',
      description: 'For growing boutique stores and direct-to-consumer brands.',
      features: ['Up to 3 Active Agents', '5,000 Messages / mo', '128-dim RAG Knowledge Base', 'Standard Support']
    },
    {
      id: 'GROWTH',
      name: 'Growth Scale',
      price: '$199',
      period: '/ mo',
      popular: true,
      description: 'Full multi-tool agent runtime with automated fulfillment actions.',
      features: ['Up to 15 Active Agents', '50,000 Messages / mo', '15 Typed Commerce Tools', 'Automated Evaluations Suite', 'Priority 24/7 SLA']
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise Cloud',
      price: '$799',
      period: '/ mo',
      description: 'Dedicated LLM clusters, custom vector index, and RBAC teams.',
      features: ['Unlimited Fleet & Workspaces', 'Unlimited Message Volume', 'Custom Knowledge Connectors', 'Dedicated Account Architect', 'Full Audit Logging']
    }
  ];

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#09090b]">
        <Navbar />

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#09090b]">
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="border-b border-zinc-800 pb-4">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-zinc-400" />
                Subscription &amp; Resource Usage
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Monitor monthly message quotas, vector storage, and workspace plan tier.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 border-b border-zinc-800 pb-2 overflow-x-auto">
              <Link href="/settings" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                General
              </Link>
              <Link href="/billing" className="px-3 py-1 text-xs font-semibold rounded-lg bg-zinc-800 text-white whitespace-nowrap">
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

            {/* Usage Quotas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 space-y-1.5 font-mono">
                <span className="text-[11px] uppercase text-zinc-500 font-sans">Monthly Messages</span>
                <div className="text-xl font-bold text-white">12,480 / 50,000</div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>

              <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 space-y-1.5 font-mono">
                <span className="text-[11px] uppercase text-zinc-500 font-sans">Knowledge Chunks</span>
                <div className="text-xl font-bold text-white">420 / 5,000</div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: '8.4%' }}></div>
                </div>
              </div>

              <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 space-y-1.5 font-mono">
                <span className="text-[11px] uppercase text-zinc-500 font-sans">Active Agents</span>
                <div className="text-xl font-bold text-white">3 / 15</div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: '20%' }}></div>
                </div>
              </div>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className={`bg-[#121215] border rounded-xl p-5 flex flex-col justify-between relative transition ${
                    p.popular
                      ? 'border-zinc-500 shadow-sm'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-white">{p.name}</h3>
                        {p.popular && (
                          <span className="bg-white text-zinc-950 text-[10px] font-bold uppercase px-1.5 py-0.2 rounded font-mono">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{p.description}</p>
                    </div>

                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-2xl font-bold text-white">{p.price}</span>
                      <span className="text-xs text-zinc-500">{p.period}</span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                      {p.features.map((feat, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                          <Check className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPlan(p.id);
                      setUpgraded(true);
                      setTimeout(() => setUpgraded(false), 3000);
                    }}
                    className={`w-full mt-5 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                      p.id === selectedPlan
                        ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 cursor-default'
                        : 'bg-white hover:bg-zinc-200 text-zinc-950'
                    }`}
                  >
                    {p.id === selectedPlan ? 'Active Plan' : `Switch to ${p.name}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}