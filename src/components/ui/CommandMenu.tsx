'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, Bot, LayoutDashboard, MessageSquare, Database, 
  Layers, Key, CreditCard, Settings, Shield, Plus, Sparkles,
  Play, CheckCircle2, ArrowRight, ExternalLink, Globe
} from 'lucide-react';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandMenu({ isOpen, onClose }: CommandMenuProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      fetch('/api/agents')
        .then(res => res.json())
        .then(data => setAgents(data.agents || []))
        .catch(() => {});
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Toggle handled by caller or window event
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navItems = [
    { label: 'Dashboard Overview', path: '/dashboard', icon: LayoutDashboard, category: 'Navigation' },
    { label: 'AI Agents Fleet', path: '/agents', icon: Bot, category: 'Navigation' },
    { label: 'Products & Store Inventory', path: '/products', icon: Layers, category: 'Navigation' },
    { label: 'Knowledge Base & RAG Index', path: '/knowledge', icon: Database, category: 'Navigation' },
    { label: 'Store Integrations & Connectors', path: '/integrations', icon: Layers, category: 'Navigation' },
    { label: 'Agent Action Permissions & Tools', path: '/actions', icon: Shield, category: 'Navigation' },
    { label: 'Conversations & Live Inbox', path: '/conversations', icon: MessageSquare, category: 'Navigation' },
    { label: 'AI Search & Natural Query', path: '/search', icon: Search, category: 'Navigation' },
    { label: 'Store & Revenue Analytics', path: '/analytics', icon: Sparkles, category: 'Navigation' },
    { label: 'Deployments & Embed Snippets', path: '/deployments', icon: Globe, category: 'Navigation' },
    { label: 'Security & Tenant Governance', path: '/security', icon: Shield, category: 'Navigation' },
    { label: 'Team Members & Roles', path: '/team', icon: Plus, category: 'Navigation' },
    { label: 'Billing & Quotas', path: '/billing', icon: CreditCard, category: 'Navigation' },
    { label: 'SuperAdmin System Portal', path: '/admin', icon: Shield, category: 'Navigation' },
  ];

  const actionItems = [
    { label: 'Create New AI Agent', path: '/agents/new', icon: Plus, category: 'Actions' },
    { label: 'Launch Public Embed Demo', path: '/embed/dep_live_widget_01', icon: ExternalLink, category: 'Actions' },
  ];

  const agentItems = agents.map(a => ({
    label: `${a.name} (v${a.version || '1.0'}) — Studio`,
    path: `/agents/${a.id}`,
    icon: Sparkles,
    category: 'Agents',
  }));

  const allItems = [...actionItems, ...agentItems, ...navItems].filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path: string) => {
    onClose();
    router.push(path);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-xl bg-[#121215] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden divide-y divide-zinc-850"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3 gap-3 bg-[#09090b]">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, agent name, or destination..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-850 rounded border border-zinc-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-zinc-800/40">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              {allItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={`${item.path}-${idx}`}
                    onClick={() => handleSelect(item.path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left text-zinc-300 hover:text-white hover:bg-zinc-850 border border-transparent transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-zinc-800 text-zinc-400 group-hover:text-zinc-200 group-hover:bg-zinc-700 flex items-center justify-center transition">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono">{item.category}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#09090b] flex items-center justify-between text-[11px] text-zinc-500 font-mono border-t border-zinc-800">
          <span>Navigate with ⌘K</span>
          <span>Enterprise Agent-as-a-Service</span>
        </div>
      </div>
    </div>
  );
}
