'use client';
import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import StudioSidebar from '@/components/layout/StudioSidebar';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AgentConversationsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const agentId = resolvedParams.id;
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/conversations')
      .then(r => r.json())
      .then(d => {
        const list = (d.conversations || []).filter((c: any) => c.agent_id === agentId);
        setConversations(list.length > 0 ? list : d.conversations || []);
      })
      .catch(() => {});
  }, [agentId]);

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans antialiased overflow-hidden selection:bg-zinc-700 selection:text-white">
      <StudioSidebar agentId={agentId} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Agent Conversation Sessions</h1>
              <p className="text-xs text-zinc-400 mt-1">Audit customer dialogs, tool calls, and escalations handled by this agent.</p>
            </div>

            <div className="p-6 rounded-xl bg-[#121215] border border-zinc-800 space-y-4">
              <div className="divide-y divide-zinc-800">
                {conversations.map((c) => (
                  <div key={c.id} className="py-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-zinc-200 text-xs">{c.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                          c.status === 'ESCALATED'
                            ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                            : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">Channel: {c.channel} • {c.message_count} messages</p>
                    </div>
                    <Link
                      href={`/conversations`}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-medium rounded-lg transition"
                    >
                      View Live Inbox
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
