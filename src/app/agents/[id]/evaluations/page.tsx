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
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans antialiased overflow-hidden selection:bg-zinc-700 selection:text-white">
      <StudioSidebar agentId={agentId} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Agent Evaluation Suite</h1>
                <p className="text-xs text-zinc-400 mt-1">Benchmark intent accuracy, tool selection correctness, and policy compliance.</p>
              </div>
              <button
                onClick={handleRunAll}
                disabled={running}
                className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-lg transition flex items-center gap-2 shadow"
              >
                <Play className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} />
                <span>{running ? 'Running Test Suite...' : 'Run All Evaluations'}</span>
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                <TestTube className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

          {/* Evaluation Metrics Summary */}
          {lastRun && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800 space-y-1">
                <span className="text-[10px] text-zinc-400 font-mono uppercase">Success Rate</span>
                <p className="text-xl font-bold font-mono text-emerald-400">{lastRun.task_success_rate}%</p>
                <p className="text-[10px] text-zinc-500 font-mono">{lastRun.passed_cases}/{lastRun.total_cases} passed</p>
              </div>

              <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800 space-y-1">
                <span className="text-[10px] text-zinc-400 font-mono uppercase">Tool Accuracy</span>
                <p className="text-xl font-bold font-mono text-zinc-100">{lastRun.tool_accuracy_rate}%</p>
                <p className="text-[10px] text-zinc-500 font-mono">Schema & intent match</p>
              </div>

              <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800 space-y-1">
                <span className="text-[10px] text-zinc-400 font-mono uppercase">Knowledge Accuracy</span>
                <p className="text-xl font-bold font-mono text-zinc-100">{lastRun.knowledge_accuracy_rate}%</p>
                <p className="text-[10px] text-zinc-500 font-mono">Attribution citation</p>
              </div>

              <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800 space-y-1">
                <span className="text-[10px] text-zinc-400 font-mono uppercase">Average Latency</span>
                <p className="text-xl font-bold font-mono text-zinc-100">{lastRun.avg_latency_ms}ms</p>
                <p className="text-[10px] text-zinc-500 font-mono">Per execution cycle</p>
              </div>
            </div>
          )}

          {/* Test Cases Table */}
          <div className="p-6 rounded-xl bg-[#121215] border border-zinc-800 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-200">Golden Evaluation Cases ({cases.length})</h3>

            <div className="divide-y divide-zinc-800">
              {cases.map((c) => {
                const runResult = lastRun?.results?.find((r: any) => r.case_id === c.id);
                return (
                  <div key={c.id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {runResult ? (
                          runResult.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />
                        ) : (
                          <div className="h-3 w-3 rounded-full bg-zinc-800" />
                        )}
                        <h4 className="font-semibold text-xs text-zinc-200">{c.name}</h4>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-400 font-semibold">{c.expected_intent}</span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#09090b] border border-zinc-800 text-xs space-y-1 font-mono">
                      <p className="text-zinc-300"><strong>Input:</strong> "{c.user_input}"</p>
                      <p className="text-zinc-500"><strong>Expected Tools:</strong> {c.expected_tools.join(', ') || 'None'}</p>
                      {runResult && (
                        <p className="text-zinc-400"><strong>Actual Response:</strong> {runResult.actual_response}</p>
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
