'use client';
import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/layout/Navbar';
import StudioSidebar from '@/components/layout/StudioSidebar';
import ChatBox from '@/components/chat/ChatBox';
import TraceInspector from '@/components/studio/TraceInspector';

export default function PlaygroundPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const agentId = resolvedParams.id;
  const [agent, setAgent] = useState<any>(null);
  const [currentTrace, setCurrentTrace] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/agents/${agentId}`)
      .then(r => r.json())
      .then(d => setAgent(d.agent))
      .catch(() => {});
  }, [agentId]);

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans antialiased overflow-hidden selection:bg-zinc-700 selection:text-white">
      <StudioSidebar agentId={agentId} agentName={agent?.name} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-0 overflow-hidden">
          <div className="h-full min-h-0">
            <ChatBox
              agentId={agentId}
              agentName={agent?.name || 'ShopMate AI'}
              onTraceUpdate={trace => setCurrentTrace(trace)}
            />
          </div>
          <div className="h-full min-h-0 overflow-hidden">
            <TraceInspector trace={currentTrace} />
          </div>
        </main>
      </div>
    </div>
  );
}
