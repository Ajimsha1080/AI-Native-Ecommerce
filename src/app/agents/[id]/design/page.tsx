'use client';
import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/layout/Navbar';
import StudioSidebar from '@/components/layout/StudioSidebar';
import { Bot, Save, CheckCircle2, Sliders, Palette, FileText, ShieldAlert } from 'lucide-react';

export default function AgentDesignPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const agentId = resolvedParams.id;
  const [data, setData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [tone, setTone] = useState<'friendly' | 'professional' | 'concise' | 'detailed' | 'persuasive' | 'casual'>('friendly');
  const [enthusiasm, setEnthusiasm] = useState(80);
  const [formality, setFormality] = useState(30);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [fallback, setFallback] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/agents/${agentId}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        if (d.agent) setName(d.agent.name);
        if (d.config) {
          setBrandName(d.config.identity?.brand_name || '');
          setGreeting(d.config.identity?.greeting || '');
          setTone(d.config.personality?.tone || 'friendly');
          setEnthusiasm(d.config.personality?.enthusiasm_level || 80);
          setFormality(d.config.personality?.formality_level || 30);
          setSystemPrompt(d.config.instructions?.system_prompt || '');
          setFallback(d.config.instructions?.fallback_response || '');
          setPrimaryColor(d.config.appearance?.primary_color || '#4f46e5');
        }
      })
      .catch(() => {});
  }, [agentId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: { name },
          config: {
            identity: { ...data?.config?.identity, name, brand_name: brandName, greeting },
            personality: { ...data?.config?.personality, tone, enthusiasm_level: enthusiasm, formality_level: formality },
            instructions: { ...data?.config?.instructions, system_prompt: systemPrompt, fallback_response: fallback },
            appearance: { ...data?.config?.appearance, primary_color: primaryColor }
          }
        })
      });

      if (!res.ok) throw new Error('Failed to save configuration');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans antialiased overflow-hidden selection:bg-zinc-700 selection:text-white">
      <StudioSidebar agentId={agentId} agentName={data?.agent?.name} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Design & Identity Studio</h1>
                <p className="text-xs text-zinc-400 mt-1">Configure personality tone, system instructions, and brand appearance.</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-lg transition flex items-center gap-2 shadow"
              >
                {saved ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Save className="h-3.5 w-3.5" />}
                <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Configuration'}</span>
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Identity */}
            <div className="p-6 rounded-xl bg-[#121215] border border-zinc-800 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                <Bot className="h-4 w-4 text-zinc-400" />
                <span>1. Agent Identity & Greeting</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Agent Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={e => setBrandName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Initial Greeting Message</label>
                <textarea
                  rows={2}
                  value={greeting}
                  onChange={e => setGreeting(e.target.value)}
                  className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            {/* Personality Sliders */}
            <div className="p-6 rounded-xl bg-[#121215] border border-zinc-800 space-y-5">
              <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-zinc-400" />
                <span>2. Personality & Behavioral Tone</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {['friendly', 'professional', 'concise', 'detailed', 'persuasive', 'casual'].map((tOption) => (
                  <button
                    key={tOption}
                    type="button"
                    onClick={() => setTone(tOption as any)}
                    className={`p-2.5 rounded-lg border text-xs font-medium capitalize transition ${
                      tone === tOption
                        ? 'bg-zinc-800 text-zinc-100 border-zinc-600 shadow-sm'
                        : 'bg-[#09090b] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {tOption}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-300">Enthusiasm Level</span>
                    <span className="font-mono text-zinc-400">{enthusiasm}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={enthusiasm}
                    onChange={e => setEnthusiasm(Number(e.target.value))}
                    className="w-full accent-zinc-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-300">Formality Level</span>
                    <span className="font-mono text-zinc-400">{formality}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formality}
                    onChange={e => setFormality(Number(e.target.value))}
                    className="w-full accent-zinc-400"
                  />
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-6 rounded-xl bg-[#121215] border border-zinc-800 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-400" />
                <span>3. System Prompt & Instructions</span>
              </h3>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">System Instructions Prompt</label>
                <textarea
                  rows={6}
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#09090b] border border-zinc-800 rounded-lg font-mono text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Fallback Response</label>
                <input
                  type="text"
                  value={fallback}
                  onChange={e => setFallback(e.target.value)}
                  className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            {/* Appearance */}
            <div className="p-6 rounded-xl bg-[#121215] border border-zinc-800 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                <Palette className="h-4 w-4 text-zinc-400" />
                <span>4. Appearance & Widget Styling</span>
              </h3>

              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Brand Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="h-8 w-12 rounded bg-transparent border-0 cursor-pointer"
                    />
                    <span className="font-mono text-xs text-zinc-400">{primaryColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </form>
          </div>
        </main>
      </div>
    </div>
  );
}
