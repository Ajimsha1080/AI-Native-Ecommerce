'use client';

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { useRouter } from 'next/navigation';
import { Bot, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';

const templates = [
  {
    id: 'footwear_concierge',
    name: 'Footwear & Apparel Stylist',
    role: 'Product Specialist & Size Guide',
    description: 'Assists with sizing calculations, color recommendations, live inventory checks, and multi-item cart building.',
    tone: 'Helpful, efficient, and style-savvy',
    systemPrompt: 'You are an expert footwear & apparel stylist. Help customers find items matching their sizing, budget, and intended activity using verified catalog tools.',
    primaryColor: '#ffffff'
  },
  {
    id: 'support_returns',
    name: 'Post-Purchase Support',
    role: 'Customer Care & Logistics',
    description: 'Automates order tracking via UPS/FedEx, 30-day return eligibility checks, and instant return label generation.',
    tone: 'Empathetic, precise, and direct',
    systemPrompt: 'You are a post-purchase support assistant. Help customers track shipments, verify return windows, and initiate exchanges.',
    primaryColor: '#ffffff'
  },
  {
    id: 'flash_deals',
    name: 'Promotions & Discounts',
    role: 'Conversion & Deals Specialist',
    description: 'Highlights active coupon codes, validates bundle savings, and assists with checkout.',
    tone: 'Helpful, direct, and proactive',
    systemPrompt: 'You are a promotional assistant. Validate coupon codes, highlight active store offers, and assist with checkout.',
    primaryColor: '#ffffff'
  }
];

export default function NewAgentPage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [name, setName] = useState(templates[0].name);
  const [role, setRole] = useState(templates[0].role);
  const [systemPrompt, setSystemPrompt] = useState(templates[0].systemPrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyTemplate = (t: typeof templates[0]) => {
    setSelectedTemplate(t);
    setName(t.name);
    setRole(t.role);
    setSystemPrompt(t.systemPrompt);
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: selectedTemplate.description,
          config: {
            persona: {
              name,
              role,
              tone: selectedTemplate.tone,
              systemPrompt
            },
            model: {
              provider: 'openai',
              modelName: 'gpt-4o',
              temperature: 0.2
            },
            theme: {
              primaryColor: '#ffffff',
              headerTitle: name,
              bubblePosition: 'bottom-right'
            }
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create agent');
      }

      router.push(`/agents/${data.agent.id}`);
    } catch (err: any) {
      setError(err.message || 'Creation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-[#f4f5f7] text-zinc-900 font-sans selection:bg-zinc-200 selection:text-zinc-900 antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-zinc-700" />
                Create New Commerce Agent
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select a template or configure custom system instructions and tools.
              </p>
            </div>

            {/* Template Chooser */}
            <div className="space-y-2.5">
              <label className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">1. Preset Template</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {templates.map((tpl) => {
                  const isSelected = selectedTemplate.id === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className={`text-left p-4 rounded-2xl border transition flex flex-col justify-between gap-3 shadow-2xs ${
                        isSelected
                          ? 'bg-white border-zinc-900 ring-2 ring-zinc-900/10'
                          : 'bg-white border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="w-8 h-8 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 text-xs font-mono shadow-2xs">
                            <Bot className="w-4 h-4" />
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-zinc-900" />}
                        </div>
                        <h4 className="text-xs font-bold text-zinc-900">{tpl.name}</h4>
                        <p className="text-[11px] text-zinc-500 leading-snug">{tpl.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-2xs">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Agent Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Persona / Role</label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Base System Instructions</label>
                <textarea
                  rows={4}
                  required
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-400 leading-relaxed"
                />
              </div>

              <div className="pt-4 border-t border-zinc-200 flex items-center justify-between">
                <Link
                  href="/agents"
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {loading ? 'Creating Agent...' : 'Create Agent & Open Studio'} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
