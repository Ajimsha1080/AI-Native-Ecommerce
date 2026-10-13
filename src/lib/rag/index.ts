import { createServiceJwt } from '../auth';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

export interface RAGPipelineResult {
  raw_question: string;
  query_understanding: {
    detected_intent: string;
    extracted_entities: Record<string, any>;
    is_domain_policy: boolean;
  };
  query_rewrite: {
    original_query: string;
    rewritten_query: string;
    expansion_terms: string[];
  };
  hybrid_retrieval: {
    dense_hits: number;
    sparse_hits: number;
  };
  rrf_fusion: {
    fused_candidates: number;
    rrf_constant: number;
  };
  reranking: {
    candidates_scored: number;
    top_score: number;
  };
  context_assembly: {
    assembled_context: string;
    total_tokens: number;
    chunks_included: number;
  };
  grounding_verification: {
    is_grounded: boolean;
    confidence_score: number;
    verified_facts_count: number;
  };
  natural_answer: string;
  citations: Array<{
    document_name: string;
    chunk_text: string;
    relevance_score: number;
    is_verified: boolean;
  }>;
}

/**
 * Authenticated proxy executing the 12-Stage RAG Pipeline via the Python FastAPI Backend Engine.
 * Python FastAPI is the single source of truth for RAG and vector retrieval.
 */
export async function executeRAGPipeline(
  workspaceId: string,
  question: string,
  options: {
    topK?: number;
    minScore?: number;
    agentId?: string;
  } = {}
): Promise<RAGPipelineResult> {
  const { topK = 3 } = options;

  if (!workspaceId) {
    throw new Error('workspaceId is required for RAG pipeline execution');
  }

  const serviceToken = await createServiceJwt(workspaceId, 'rag-proxy');
  const response = await fetch(`${PYTHON_BACKEND_URL}/api/v1/rag/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceToken}`
    },
    body: JSON.stringify({
      question,
      workspace_id: workspaceId,
      top_k: topK
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Python RAG Engine error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

export interface DocumentInput {
  name?: string;
  title?: string;
  type?: string;
  rawContent?: string;
  content?: string;
  agentId?: string;
}

/**
 * Ingests a knowledge document via the Python FastAPI Backend Engine.
 */
export async function ingestDocument(
  workspaceId: string,
  titleOrInput: string | DocumentInput,
  contentArg?: string,
  metadataArg?: Record<string, any>
): Promise<{ success: boolean; document_id: string; title: string; chunks_created: number }> {
  if (!workspaceId) {
    throw new Error('workspaceId is required for knowledge ingestion');
  }

  let title = '';
  let content = '';
  let metadata: Record<string, any> | undefined = metadataArg;

  if (typeof titleOrInput === 'string') {
    title = titleOrInput;
    content = contentArg || '';
  } else {
    title = titleOrInput.name || titleOrInput.title || 'Untitled Document';
    content = titleOrInput.rawContent || titleOrInput.content || contentArg || '';
    metadata = {
      type: titleOrInput.type,
      agentId: titleOrInput.agentId,
      ...metadataArg
    };
  }

  const serviceToken = await createServiceJwt(workspaceId, 'knowledge-ingest-proxy');
  const response = await fetch(`${PYTHON_BACKEND_URL}/api/v1/knowledge/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceToken}`
    },
    body: JSON.stringify({
      title,
      content,
      workspace_id: workspaceId,
      metadata
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Python Knowledge Ingestion error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Math utility for vector cosine similarity evaluation.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Text chunking utility.
 */
export function chunkText(text: string, maxTokens: number = 300, overlap: number = 50): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  if (paragraphs.length <= 1) {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += (maxTokens - overlap)) {
      chunks.push(words.slice(i, i + maxTokens).join(' '));
    }
    return chunks.length > 0 ? chunks : [text];
  }
  return paragraphs;
}

export function generateEmbedding(text: string): number[] {
  // Generates normalized float vector representation
  const vector = new Array(128).fill(0);
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = clean.split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return vector;
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) & 0xffffffff;
    }
    const idx = Math.abs(hash) % 128;
    vector[idx] += 1.0;
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? vector.map(v => v / norm) : vector;
}
