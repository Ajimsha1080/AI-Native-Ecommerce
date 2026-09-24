'use client';

import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/layout/Navbar';
import StudioSidebar from '@/components/layout/StudioSidebar';
import { 
  Bot, Save, CheckCircle2, Sliders, Palette, 
  FileText, ShieldAlert, Check, Sparkles 
} from 'lucide-react';

interface ThemePreset {
  id: string;
  name: string;
  isPremium?: boolean;
  primaryColor: string;
  canvasBg: string;
  topBubbleBg: string;
  midBubbleBg: string;
  inputBg: string;
  dotColor: string;
  description: string;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'emerald_luxury',
    name: 'Emerald Luxury',
    primaryColor: '#059669',
    canvasBg: 'bg-gradient-to-b from-emerald-50/90 to-teal-50/40',
    topBubbleBg: 'bg-emerald-100/90 border border-emerald-200/70',
    midBubbleBg: 'bg-white shadow-xs border border-emerald-100',
    inputBg: 'bg-white border border-emerald-200/80',
    dotColor: '#059669',
    description: 'Prestige forest emerald with fresh botanical highlights'
  },
  {
    id: 'rose_velvet',
    name: 'Rose Velvet',
    primaryColor: '#e11d48',
    canvasBg: 'bg-gradient-to-b from-rose-50/90 to-pink-50/40',
    topBubbleBg: 'bg-rose-100/90 border border-rose-200/70',
    midBubbleBg: 'bg-white shadow-xs border border-rose-100',
    inputBg: 'bg-white border border-rose-200/80',
    dotColor: '#e11d48',
    description: 'Romantic champagne rose with rich berry velvet accents'
  },
  {
    id: 'cyber_neon',
    name: 'Cyber Neon',
    primaryColor: '#06b6d4',
    canvasBg: 'bg-gradient-to-b from-slate-900 to-slate-950',
    topBubbleBg: 'bg-cyan-950/80 border border-cyan-700/50',
    midBubbleBg: 'bg-slate-800/90 shadow-xs border border-slate-700/70',
    inputBg: 'bg-slate-900 border border-cyan-500/40',
    dotColor: '#06b6d4',
    description: 'High-tech matrix dark mode with vivid glowing cyan'
  },
  {
    id: 'nordic_frost',
    name: 'Nordic Frost',
    primaryColor: '#0284c7',
    canvasBg: 'bg-gradient-to-b from-sky-50/90 to-blue-50/40',
    topBubbleBg: 'bg-sky-100/90 border border-sky-200/70',
    midBubbleBg: 'bg-white shadow-xs border border-sky-100',
    inputBg: 'bg-white border border-sky-200/80',
    dotColor: '#0284c7',
    description: 'Cool Scandinavian ice blue with crisp minimal styling'
  },
  {
    id: 'amber_glow',
    name: 'Amber Glow',
    primaryColor: '#d97706',
    canvasBg: 'bg-gradient-to-b from-amber-50/90 to-orange-50/40',
    topBubbleBg: 'bg-amber-100/90 border border-amber-200/70',
    midBubbleBg: 'bg-white shadow-xs border border-amber-100',
    inputBg: 'bg-white border border-amber-200/80',
    dotColor: '#d97706',
    description: 'Warm honey caramel and golden twilight aesthetic'
  },
  {
    id: 'obsidian_gold',
    name: 'Obsidian Gold',
    primaryColor: '#f59e0b',
    canvasBg: 'bg-gradient-to-b from-zinc-900 to-black',
    topBubbleBg: 'bg-zinc-800 border border-amber-500/40',
    midBubbleBg: 'bg-zinc-800/90 shadow-xs border border-zinc-700',
    inputBg: 'bg-zinc-900 border border-amber-400/40',
    dotColor: '#f59e0b',
    description: 'Ultra-luxe matte obsidian black with metallic gold trims'
  },
  {
    id: 'lavender_mist',
    name: 'Lavender Mist',
    primaryColor: '#9333ea',
    canvasBg: 'bg-gradient-to-b from-purple-50/90 to-fuchsia-50/40',
    topBubbleBg: 'bg-purple-100/90 border border-purple-200/70',
    midBubbleBg: 'bg-white shadow-xs border border-purple-100',
    inputBg: 'bg-white border border-purple-200/80',
    dotColor: '#9333ea',
    description: 'Delicate wisteria blossom with royal purple accents'
  },
  {
    id: 'oceanic_wave',
    name: 'Oceanic Wave',
    primaryColor: '#0d9488',
    canvasBg: 'bg-gradient-to-b from-teal-50/90 to-cyan-50/40',
    topBubbleBg: 'bg-teal-100/90 border border-teal-200/70',
    midBubbleBg: 'bg-white shadow-xs border border-teal-100',
    inputBg: 'bg-white border border-teal-200/80',
    dotColor: '#0d9488',
    description: 'Deep marine turquoise with soothing coastal hues'
  },
  {
    id: 'monochrome_pro',
    name: 'Monochrome Pro',
    primaryColor: '#18181b',
    canvasBg: 'bg-gradient-to-b from-zinc-100/90 to-zinc-50',
    topBubbleBg: 'bg-zinc-200 border border-zinc-300',
    midBubbleBg: 'bg-white shadow-xs border border-zinc-200',
    inputBg: 'bg-white border border-zinc-300',
    dotColor: '#18181b',
    description: 'Architectural titanium grayscale for minimalist stores'
  },
  {
    id: 'cherry_blossom',
    name: 'Cherry Blossom',
    primaryColor: '#ec4899',
    canvasBg: 'bg-gradient-to-b from-pink-50/90 to-rose-50/40',
    topBubbleBg: 'bg-pink-100/90 border border-pink-200/70',
    midBubbleBg: 'bg-white shadow-xs border border-pink-100',
    inputBg: 'bg-white border border-pink-200/80',
    dotColor: '#ec4899',
    description: 'Soft Japanese sakura aesthetic with pastel magenta pops'
  },
  {
    id: 'cosmic_chills',
    name: 'Cosmic Chills',
    primaryColor: '#7c3aed',
    canvasBg: 'bg-gradient-to-b from-violet-50/90 to-indigo-50/40',
    topBubbleBg: 'bg-violet-100/90 border border-violet-200/70',
    midBubbleBg: 'bg-white shadow-xs border border-violet-100',
    inputBg: 'bg-white border border-violet-200/80',
    dotColor: '#7c3aed',
    description: 'Clean modern lavender aesthetic with soft violet accents'
  },
  {
    id: 'cosmic_depth',
    name: 'Cosmic Depth',
    primaryColor: '#8b5cf6',
    canvasBg: 'bg-gradient-to-b from-slate-950 to-indigo-950',
    topBubbleBg: 'bg-indigo-950 border border-violet-700/50',
    midBubbleBg: 'bg-slate-900 shadow-xs border border-slate-700/70',
    inputBg: 'bg-slate-950 border border-violet-500/40',
    dotColor: '#8b5cf6',
    description: 'Deep cosmic dark mode with vibrant neon violet accents'
  },
  {
    id: 'sunset_bliss',
    name: 'Sunset Bliss',
    primaryColor: '#f97316',
    canvasBg: 'bg-gradient-to-b from-orange-50/90 to-amber-50/40',
    topBubbleBg: 'bg-orange-100/90 border border-orange-200/70',
    midBubbleBg: 'bg-white shadow-xs border border-orange-100',
    inputBg: 'bg-white border border-orange-200/80',
    dotColor: '#f97316',
    description: 'Warm pastel peach & sunset glow with coral accents'
  },
  {
    id: 'stary_night',
    name: 'Stary Night',
    primaryColor: '#2563eb',
    canvasBg: 'bg-gradient-to-b from-blue-50/90 to-indigo-50/40',
    topBubbleBg: 'bg-blue-100/90 border border-blue-200/70',
    midBubbleBg: 'bg-white shadow-xs border border-blue-100',
    inputBg: 'bg-white border border-blue-200/80',
    dotColor: '#2563eb',
    description: 'Crisp royal sapphire blue with clean starlight contrast'
  },
  {
    id: 'midnight_crimson',
    name: 'Midnight Crimson',
    primaryColor: '#f43f5e',
    canvasBg: 'bg-gradient-to-b from-zinc-950 to-stone-900',
    topBubbleBg: 'bg-rose-950/80 border border-rose-800/50',
    midBubbleBg: 'bg-zinc-900 shadow-xs border border-zinc-800',
    inputBg: 'bg-zinc-950 border border-rose-500/40',
    dotColor: '#f43f5e',
    description: 'Dramatic dark theme with luminous ruby neon highlights'
  }
];

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
  const [primaryColor, setPrimaryColor] = useState('#7c3aed');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('cosmic_chills');

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
          const preset = d.config.appearance?.theme_preset || 'cosmic_chills';
          setSelectedPresetId(preset);
          setPrimaryColor(d.config.appearance?.primary_color || '#7c3aed');
        }
      })
      .catch(() => {});
  }, [agentId]);

  const handleSelectThemePreset = (preset: ThemePreset) => {
    setSelectedPresetId(preset.id);
    setPrimaryColor(preset.primaryColor);
  };

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
            appearance: { ...data?.config?.appearance, primary_color: primaryColor, theme_preset: selectedPresetId }
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
    <div className="flex h-screen bg-[#f4f5f7] text-zinc-900 font-sans antialiased overflow-hidden selection:bg-zinc-200">
      <StudioSidebar agentId={agentId} agentName={data?.agent?.name} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Design & Identity Studio</h1>
                <p className="text-xs text-zinc-600 mt-1">Configure personality tone, system instructions, and brand appearance presets.</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {saved ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Save className="h-3.5 w-3.5" />}
                <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Configuration'}</span>
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              {/* 1. Identity & Greeting */}
              <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-4 shadow-2xs">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <Bot className="h-4 w-4 text-zinc-500" />
                  <span>1. Agent Identity & Greeting</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">Agent Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">Brand Name</label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={e => setBrandName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">Initial Greeting Message</label>
                  <textarea
                    rows={2}
                    value={greeting}
                    onChange={e => setGreeting(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 focus:bg-white transition leading-relaxed"
                  />
                </div>
              </div>

              {/* 2. Personality & Behavioral Tone */}
              <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-5 shadow-2xs">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-zinc-500" />
                  <span>2. Personality & Behavioral Tone</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {['friendly', 'professional', 'concise', 'detailed', 'persuasive', 'casual'].map((tOption) => (
                    <button
                      key={tOption}
                      type="button"
                      onClick={() => setTone(tOption as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold capitalize transition cursor-pointer ${
                        tone === tOption
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                          : 'bg-zinc-50/60 border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-white'
                      }`}
                    >
                      {tOption}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  <div className="p-4 rounded-xl bg-zinc-50/60 border border-zinc-200/80 space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-800">Enthusiasm Level</span>
                      <span className="font-mono text-zinc-900 bg-white px-2 py-0.5 rounded border border-zinc-200">{enthusiasm}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={enthusiasm}
                      onChange={e => setEnthusiasm(Number(e.target.value))}
                      className="w-full accent-zinc-900 cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-50/60 border border-zinc-200/80 space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-800">Formality Level</span>
                      <span className="font-mono text-zinc-900 bg-white px-2 py-0.5 rounded border border-zinc-200">{formality}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formality}
                      onChange={e => setFormality(Number(e.target.value))}
                      className="w-full accent-zinc-900 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* 3. System Prompt & Instructions */}
              <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-4 shadow-2xs">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4 text-zinc-500" />
                  <span>3. System Prompt & Instructions</span>
                </h3>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">System Instructions Prompt</label>
                  <textarea
                    rows={6}
                    value={systemPrompt}
                    onChange={e => setSystemPrompt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl font-mono text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 focus:bg-white transition leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">Fallback Response</label>
                  <input
                    type="text"
                    value={fallback}
                    onChange={e => setFallback(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* 4. Appearance & Theme Presets */}
              <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-6 shadow-2xs">
                <div className="space-y-1 pb-2 border-b border-zinc-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                      <Palette className="h-4 w-4 text-zinc-500" />
                      <span>4. AI Agent Appearance</span>
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Customize widget theme presets and live brand accent styling.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                    SYNCED
                  </span>
                </div>

                {/* 15 Theme Presets */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <div key={preset.id} className="flex flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectThemePreset(preset)}
                          className={`w-full aspect-[4/4.2] rounded-2xl p-2.5 flex flex-col justify-between transition-all duration-150 cursor-pointer relative overflow-hidden text-left shadow-2xs ${
                            preset.canvasBg
                          } ${
                            isSelected
                              ? 'border-2 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                              : 'border border-zinc-200 hover:border-zinc-300 hover:scale-[1.02]'
                          }`}
                        >
                          {/* Top Bubble */}
                          <div className="flex justify-start w-full pr-6">
                            <div className={`h-4 w-12 rounded-lg ${preset.topBubbleBg} shadow-2xs opacity-90`} />
                          </div>

                          {/* Middle Bubble with Checkmark if Selected */}
                          <div className="flex justify-start w-full">
                            <div className={`h-5 w-16 rounded-xl ${preset.midBubbleBg} flex items-center justify-center text-xs shadow-2xs relative`}>
                              {isSelected && (
                                <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Bottom Input Pill Bar with Dot */}
                          <div className={`h-5 w-full rounded-xl ${preset.inputBg} flex items-center justify-end px-1.5 shadow-2xs border border-zinc-200/40`}>
                            <span 
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: preset.dotColor }}
                            />
                          </div>
                        </button>

                        {/* Theme Label */}
                        <span className={`text-xs font-semibold text-center ${
                          isSelected ? 'text-zinc-900 font-bold' : 'text-zinc-700'
                        }`}>
                          {preset.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Brand Accent Color */}
                <div className="pt-4 border-t border-zinc-100 space-y-2">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Custom Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-white border border-zinc-200 shadow-2xs"
                    />
                    <input 
                      type="text" 
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 font-mono uppercase w-32 focus:outline-none focus:border-zinc-400"
                    />
                    <div className="flex items-center gap-2">
                      {['#7c3aed', '#8b5cf6', '#f97316', '#2563eb', '#ec4899', '#10b981'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setPrimaryColor(c)}
                          className={`w-6 h-6 rounded-full border border-zinc-200 transition-transform hover:scale-110 cursor-pointer ${
                            primaryColor === c ? 'ring-2 ring-zinc-900 ring-offset-2' : ''
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
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
