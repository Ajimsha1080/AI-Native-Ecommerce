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
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="border-b border-zinc-800 pb-4">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-zinc-400" />
                Create New Commerce Agent
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Select a template or configure custom system instructions and tools.
              </p>
            </div>

            {/* Template Chooser */}
            <div className="space-y-2.5">
              <label className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider">1. Preset Template</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {templates.map((tpl) => {
                  const isSelected = selectedTemplate.id === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-zinc-800/90 border-zinc-500 shadow-sm'
                          : 'bg-[#121215] border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 text-xs font-mono">
                            <Bot className="w-3.5 h-3.5" />
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <h4 className="text-xs font-bold text-white">{tpl.name}</h4>
                        <p className="text-[11px] text-zinc-400 leading-snug">{tpl.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="bg-[#121215] border border-zinc-800 rounded-xl p-5 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Agent Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Persona / Role</label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Base System Instructions</label>
                <textarea
                  rows={4}
                  required
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-600 leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                <Link
                  href="/agents"
                  className="text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition flex items-center gap-1.5"
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
