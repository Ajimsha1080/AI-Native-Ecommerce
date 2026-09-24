'use client';

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import ChatBox from '@/components/chat/ChatBox';
import TraceInspector from '@/components/studio/TraceInspector';
import { 
  Search, Play, Bug, Database, Cpu, Sparkles, 
  CheckCircle2, ShieldCheck, Terminal, Layers, RefreshCw 
} from 'lucide-react';

export default function AISearchPlaygroundPage() {
  const [currentTrace, setCurrentTrace] = useState<any>(null);
  const [debugMode, setDebugMode] = useState(false);

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans antialiased selection:bg-zinc-700 selection:text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <div className="flex-1 overflow-hidden flex flex-col p-5 space-y-4">
          
          {/* Header & Debug Mode Toggle */}
          <div className="bg-[#121215] border border-zinc-800 rounded-xl px-5 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white flex items-center gap-2">
                  AI Search &amp; Storefront Testing Playground
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h1>
                <p className="text-[11px] text-zinc-400">
                  Simulate customer natural queries, product searches, image uploads, policy lookups, and live orders.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Debug / Diagnostics Mode Toggle */}
              <button
                onClick={() => setDebugMode(!debugMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
                  debugMode
                    ? 'bg-purple-950/60 text-purple-300 border-purple-800/60 font-semibold'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <Bug className="w-3.5 h-3.5" />
                <span>Admin Diagnostics: {debugMode ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Main Workspace Split: Chat Playground (Left) & Optional Debug Diagnostics (Right) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
            
            {/* Chat Testing Window */}
            <div className={`${debugMode ? 'lg:col-span-7' : 'lg:col-span-12'} h-full min-h-0`}>
              <ChatBox
                agentId="agent_shopmate_01"
                agentName="ShopMate AI Concierge"
                onTraceUpdate={(trace) => setCurrentTrace(trace)}
              />
            </div>

            {/* Debug Retrieval Diagnostics (Without exposing Chain-of-thought) */}
            {debugMode && (
              <div className="lg:col-span-5 h-full min-h-0 overflow-hidden flex flex-col bg-[#121215] border border-zinc-800 rounded-xl shadow-sm">
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-purple-400" />
                    <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                      Retrieval Diagnostics
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">Live RRF Telemetry</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentTrace ? (
                    <TraceInspector trace={currentTrace} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
                      <Database className="w-8 h-8 text-zinc-600" />
                      <p className="text-xs font-medium text-zinc-400">Awaiting Search Query</p>
                      <p className="text-[11px] text-zinc-500 max-w-xs">
                        Type a question like &quot;Show me black running shoes under $150&quot; to inspect dense/sparse ranking and grounding scores.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
