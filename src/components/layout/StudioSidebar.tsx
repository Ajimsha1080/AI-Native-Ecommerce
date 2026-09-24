'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ArrowLeft, Bot, Palette, BookOpen, ShoppingBag, Wrench, 
  ShieldCheck, BrainCircuit, Play, CheckCircle2, History, 
  Rocket, MessageSquare, BarChart3, ChevronRight 
} from 'lucide-react';

export default function StudioSidebar({ agentId, agentName }: { agentId: string; agentName?: string; [key: string]: any }) {
  const pathname = usePathname();

  const studioTabs = [
    { name: 'Overview', path: `/agents/${agentId}`, icon: Bot },
    { name: 'Identity & Persona', path: `/agents/${agentId}/design`, icon: Palette },
    { name: 'Knowledge & RAG', path: `/agents/${agentId}/knowledge`, icon: BookOpen },
    { name: 'Commerce Catalog', path: `/agents/${agentId}/commerce`, icon: ShoppingBag },
    { name: 'Tools (15+)', path: `/agents/${agentId}/tools`, icon: Wrench },
    { name: 'Guardrails & Rules', path: `/agents/${agentId}/rules`, icon: ShieldCheck },
    { name: 'Memory & Retention', path: `/agents/${agentId}/memory`, icon: BrainCircuit },
    { name: 'Playground', path: `/agents/${agentId}/playground`, icon: Play, highlight: true },
    { name: 'Evaluations', path: `/agents/${agentId}/evaluations`, icon: CheckCircle2 },
    { name: 'Version History', path: `/agents/${agentId}/versions`, icon: History },
    { name: 'Deploy & Embed', path: `/agents/${agentId}/deploy`, icon: Rocket },
    { name: 'Live Inbox', path: `/agents/${agentId}/conversations`, icon: MessageSquare },
    { name: 'Analytics', path: `/agents/${agentId}/analytics`, icon: BarChart3 },
  ];

  return (
    <aside className="w-56 border-r border-zinc-800 bg-[#09090b] flex flex-col justify-between shrink-0 select-none">
      <div className="flex flex-col">
        {/* Back button & Agent Badge */}
        <div className="h-14 px-3 border-b border-zinc-800 flex items-center justify-between">
          <Link
            href="/agents"
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Fleet
          </Link>
          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 truncate max-w-[90px]">
            {agentId}
          </span>
        </div>

        {/* Studio Sub-pages */}
        <nav className="p-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-130px)]">
          {studioTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.path;
            return (
              <Link
                key={tab.name}
                href={tab.path}
                prefetch={true}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-zinc-800 text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                  <span>{tab.name}</span>
                </div>
                {tab.highlight && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-2.5 border-t border-zinc-800">
        <Link
          href={`/agents/${agentId}/playground`}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition"
        >
          <Play className="w-3 h-3 text-emerald-400" /> Test in Playground
        </Link>
      </div>
    </aside>
  );
}