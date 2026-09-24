'use client';

import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/layout/Navbar';
import StudioSidebar from '@/components/layout/StudioSidebar';
import { TestTube, Play, CheckCircle2, XCircle, Clock, Sparkles } from 'lucide-react';

export default function EvaluationsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const agentId = resolvedParams.id;
  const [cases, setCases] = useState<any[]>([]);
  const [lastRun, setLastRun] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadEvals = () => {
    fetch(`/api/evaluations?agent_id=${agentId}`)
      .then(r => r.json())
      .then(d => {
        setCases(d.cases || []);
        if (d.runs && d.runs.length > 0) {
          setLastRun(d.runs[d.runs.length - 1]);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadEvals();
  }, [agentId]);

  const handleRunAll = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RUN', agent_id: agentId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Run failed');
      setLastRun(data.run);
    } catch (e: any) {
      setError(e.message || 'Evaluation run failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f4f5f7] text-zinc-900 font-sans antialiased overflow-hidden selection:bg-zinc-200">
      <StudioSidebar agentId={agentId} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Agent Evaluation Suite</h1>
                <p className="text-xs text-zinc-600 mt-1">Benchmark intent accuracy, tool selection correctness, and policy compliance.</p>
              </div>
              <button
                onClick={handleRunAll}
                disabled={running}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Play className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} />
                <span>{running ? 'Running Test Suite...' : 'Run All Evaluations'}</span>
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 shadow-2xs">
                <TestTube className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Evaluation Metrics Summary */}
            {lastRun && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-1 shadow-2xs">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase font-semibold">Success Rate</span>
                  <p className="text-2xl font-bold font-mono text-emerald-700">{lastRun.task_success_rate}%</p>
                  <p className="text-[10px] text-zinc-500 font-mono">{lastRun.passed_cases}/{lastRun.total_cases} passed</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-1 shadow-2xs">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase font-semibold">Tool Accuracy</span>
                  <p className="text-2xl font-bold font-mono text-zinc-900">{lastRun.tool_accuracy_rate}%</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Schema & intent match</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-1 shadow-2xs">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase font-semibold">Knowledge Accuracy</span>
                  <p className="text-2xl font-bold font-mono text-zinc-900">{lastRun.knowledge_accuracy_rate}%</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Attribution citation</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-1 shadow-2xs">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase font-semibold">Average Latency</span>
                  <p className="text-2xl font-bold font-mono text-zinc-900">{lastRun.avg_latency_ms}ms</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Per execution cycle</p>
                </div>
              </div>
            )}

            {/* Test Cases Table */}
            <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-4 shadow-2xs">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Golden Evaluation Cases ({cases.length})</h3>

              <div className="divide-y divide-zinc-100">
                {cases.map((c) => {
                  const runResult = lastRun?.results?.find((r: any) => r.case_id === c.id);
                  return (
                    <div key={c.id} className="py-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {runResult ? (
                            runResult.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />
                          ) : (
                            <div className="h-3 w-3 rounded-full bg-zinc-300" />
                          )}
                          <h4 className="font-bold text-xs text-zinc-900">{c.name}</h4>
                        </div>
                        <span className="font-mono text-[10px] text-zinc-600 font-semibold bg-zinc-100 px-2 py-0.5 rounded-full">{c.expected_intent}</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1.5 font-mono">
                        <p className="text-zinc-800"><strong>Input:</strong> "{c.user_input}"</p>
                        <p className="text-zinc-600"><strong>Expected Tools:</strong> {c.expected_tools.join(', ') || 'None'}</p>
                        {runResult && (
                          <p className="text-zinc-700"><strong>Actual Response:</strong> {runResult.actual_response}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
