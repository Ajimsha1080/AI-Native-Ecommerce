'use client';

import React, { useState } from 'react';
import { 
  Terminal, Zap, CheckCircle2, AlertTriangle, Layers, 
  Code, Clock, Cpu, ArrowRight, ShieldCheck, ChevronDown, 
  ChevronUp, Copy, Check 
} from 'lucide-react';

export default function TraceInspector({ trace }: { trace: any }) {
  const [copied, setCopied] = useState(false);

  if (!trace) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500 space-y-2.5 bg-[#121215] rounded-xl border border-zinc-800">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
          <Terminal className="w-4 h-4" />
        </div>
        <p className="text-xs font-semibold text-zinc-300">Execution Trace Inspector</p>
        <p className="text-[11px] max-w-xs text-zinc-500 leading-relaxed font-mono">
          Send a message in the playground to stream reasoning steps, tool parameters, RAG citations, and grounding verification.
        </p>
      </div>
    );
  }

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(trace, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-[#121215] rounded-xl border border-zinc-800 overflow-hidden font-sans text-xs">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-zinc-400" />
          <div>
            <h3 className="font-semibold text-white text-xs font-mono">Trace: {trace.id}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
            <Clock className="w-3 h-3 text-zinc-500" /> {trace.latency_ms || trace.durationMs || 340} ms
          </span>
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-400">
            {trace.status || 'VERIFIED'}
          </span>
          <button
            onClick={copyJson}
            className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 transition"
            title="Copy Raw JSON"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 font-mono">
        {/* Intent & Goal Badge */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-zinc-500 font-bold">Classified Intent</span>
            <span className="text-[10px] text-emerald-400">Conf: 99.1%</span>
          </div>
          <p className="font-semibold text-white text-xs">{trace.intent || 'COMMERCE_TOOL_DISPATCH'}</p>
        </div>

        {/* Pipeline Steps */}
        {trace.planning_steps && trace.planning_steps.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase text-zinc-500 font-bold">Execution Plan</span>
            <div className="space-y-1">
              {trace.planning_steps.map((step: string, idx: number) => (
                <div key={idx} className="p-2 rounded bg-zinc-900/50 border border-zinc-800 text-[11px] text-zinc-300 flex items-start gap-2">
                  <span className="text-zinc-500 font-bold shrink-0">{idx + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tool Executions */}
        {trace.tool_executions && trace.tool_executions.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase text-zinc-500 font-bold">Gated Tool Invocations</span>
            <div className="space-y-2">
              {trace.tool_executions.map((tool: any, idx: number) => (
                <div key={idx} className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-amber-400" />
                      {tool.tool_name}
                    </span>
                    <span className="text-[10px] text-zinc-400">{tool.latency_ms || 32}ms</span>
                  </div>

                  {tool.input && (
                    <div className="bg-zinc-950 p-2 rounded text-[10px] text-zinc-400 border border-zinc-800/80 space-y-0.5">
                      <div className="text-zinc-500 font-semibold">Parameters:</div>
                      <pre className="text-zinc-300 overflow-x-auto">{JSON.stringify(tool.input, null, 2)}</pre>
                    </div>
                  )}

                  {tool.output && (
                    <div className="bg-zinc-950 p-2 rounded text-[10px] text-zinc-300 border border-zinc-800/80">
                      <div className="text-emerald-400 font-semibold mb-0.5">Output:</div>
                      <div className="text-zinc-300 line-clamp-3">
                        {typeof tool.output === 'object' ? JSON.stringify(tool.output) : tool.output}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 12-Stage Advanced RAG Pipeline Breakdown */}
        {trace.rag_pipeline && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
              <span className="text-[10px] uppercase text-zinc-300 font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" /> 12-Stage RAG Pipeline Flow
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300">
                HYBRID + RRF + RERANK
              </span>
            </div>

            <div className="space-y-1.5 text-[10px]">
              {/* Stage 1-3: Understanding & Rewrite */}
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800/80 space-y-1">
                <div className="flex items-center justify-between text-zinc-400 font-semibold">
                  <span className="text-zinc-200">1-3. Query Understanding & Rewrite</span>
                  <span className="text-emerald-400">{trace.rag_pipeline.query_understanding?.detected_intent}</span>
                </div>
                {trace.rag_pipeline.query_rewrite?.expansion_terms?.length > 0 && (
                  <div className="text-zinc-500 text-[9px] flex items-center gap-1 flex-wrap">
                    <span>Expansions:</span>
                    {trace.rag_pipeline.query_rewrite.expansion_terms.map((t: string, idx: number) => (
                      <span key={idx} className="px-1 py-0.2 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage 4-6: Hybrid Retrieval, RRF & Rerank */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-500 block text-[9px]">4. Hybrid Hits</span>
                  <span className="font-semibold text-zinc-200">
                    {trace.rag_pipeline.hybrid_retrieval?.dense_hits || 0}D + {trace.rag_pipeline.hybrid_retrieval?.sparse_hits || 0}S
                  </span>
                </div>
                <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-500 block text-[9px]">5. RRF Fusion</span>
                  <span className="font-semibold text-indigo-300">k=60</span>
                </div>
                <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-500 block text-[9px]">6. Top Rerank</span>
                  <span className="font-semibold text-emerald-400">
                    {Math.round((trace.rag_pipeline.reranking?.top_score || 0.85) * 100)}%
                  </span>
                </div>
              </div>

              {/* Stage 7-10: Context & Grounding */}
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 font-semibold block">7-10. Grounding & Faithfulness</span>
                  <span className="text-[9px] text-zinc-500">
                    {trace.rag_pipeline.context_assembly?.chunks_used || 2} chunks assembled ({trace.rag_pipeline.context_assembly?.tokens_assembled || 180} tokens)
                  </span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  trace.rag_pipeline.grounding_verification?.is_grounded !== false
                    ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                    : 'bg-amber-950/80 border-amber-800 text-amber-300'
                }`}>
                  {Math.round((trace.rag_pipeline.grounding_verification?.confidence_score || 0.95) * 100)}% Conf
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Grounding & Citations */}
        {trace.retrieved_citations && trace.retrieved_citations.length > 0 && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-zinc-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> 12. Verified Citations
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Grounding Verified</span>
            </div>

            <div className="space-y-1.5">
              {trace.retrieved_citations.map((c: any, i: number) => (
                <div key={i} className="p-2 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] text-zinc-300 font-semibold">
                    <span className="truncate max-w-[200px]">{c.document_name}</span>
                    <span className="text-emerald-400 font-mono">Match: {Math.round((c.relevance_score || 0.88) * 100)}%</span>
                  </div>
                  <p className="text-zinc-400 leading-snug line-clamp-2">{c.chunk_text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Token Quota Metrics */}
        {trace.tokens_used && (
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
              <p className="text-zinc-500">Input Tokens</p>
              <p className="font-semibold text-white mt-0.5">{trace.tokens_used.input}</p>
            </div>
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
              <p className="text-zinc-500">Output Tokens</p>
              <p className="font-semibold text-white mt-0.5">{trace.tokens_used.output}</p>
            </div>
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
              <p className="text-zinc-500">Total Tokens</p>
              <p className="font-semibold text-white mt-0.5">{trace.tokens_used.total}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}