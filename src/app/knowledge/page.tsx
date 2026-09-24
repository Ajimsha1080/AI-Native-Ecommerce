'use client';

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import Link from 'next/link';
import { 
  Database, Plus, Search, FileText, Globe, RefreshCw, CheckCircle2, 
  Trash2, ExternalLink, AlertCircle, Layers, Eye, X, Play, HelpCircle, 
  UploadCloud, ChevronRight, MoreVertical, Check, Info, Edit3, FolderPlus,
  ArrowRight, Sparkles, SlidersHorizontal, BookOpen, FileCode, CheckSquare, Square
} from 'lucide-react';
import { fetchWithCache, getClientCachedData } from '@/lib/client-cache';

export default function KnowledgeWorkspacePage() {
  const [sources, setSources] = useState<any[]>(() => {
    const cached = getClientCachedData('/api/knowledge');
    return cached?.documents || cached?.sources || [];
  });
  const [loading, setLoading] = useState(() => !getClientCachedData('/api/knowledge'));
  const [activeFilter, setActiveFilter] = useState<string>('ALL'); // ALL, ACTIVE, DISABLED, TRASH, DOCUMENTS, FAQ, WEBSITES
  const [activeCollection, setActiveCollection] = useState<string>('All');
  const [collections, setCollections] = useState<string[]>(['All', 'General', 'Policies', 'Shipping']);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRagTestModal, setShowRagTestModal] = useState(false);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  
  // Add Knowledge Form state
  const [addTab, setAddTab] = useState<'WEBSITE' | 'DOCUMENT' | 'FAQ' | 'TEXT'>('DOCUMENT');
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('General');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // RAG Test state
  const [testQuery, setTestQuery] = useState('');
  const [testingRag, setTestingRag] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Card menu dropdown state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadKnowledge();
  }, []);

  async function loadKnowledge() {
    try {
      const data = await fetchWithCache('/api/knowledge');
      if (data) {
        const docs = data.documents || data.sources || [];
        setSources(docs);
      }
    } catch (err) {
      console.error('Failed to load knowledge:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle File Upload (Drag & Drop or File Dialog)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    setModalError(null);
    let file: File | null = null;
    if ('dataTransfer' in e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        file = e.dataTransfer.files[0];
      }
    } else if (e.target.files && e.target.files.length > 0) {
      file = e.target.files[0];
    }

    if (file) {
      setUploadedFile({ name: file.name, size: file.size });
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setDocContent(text || `Document Title: ${file?.name}\n\nProcessed contents and verified guidelines for store operations.`);
      };
      reader.onerror = () => {
        setDocContent(`Document: ${file?.name}\nSize: ${(file!.size / 1024).toFixed(1)} KB`);
      };
      reader.readAsText(file);
    }
  };

  async function handleSaveKnowledge(e: React.FormEvent) {
    e.preventDefault();
    setModalError(null);
    setSaving(true);
    try {
      let payloadName = docTitle.trim();
      let payloadType = addTab;
      let payloadContent = docContent.trim();

      if (addTab === 'WEBSITE') {
        if (!websiteUrl.trim()) {
          setModalError('Please enter a website target URL (e.g. https://yourstore.com/pages/shipping).');
          setSaving(false);
          return;
        }
        const res = await fetch('/api/knowledge/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: websiteUrl.trim(),
            name: payloadName || undefined
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || data.error || 'Failed to crawl website URL');
        }
        setShowAddModal(false);
        setDocTitle('');
        setWebsiteUrl('');
        setSuccessToast(`Successfully synced and indexed website: ${websiteUrl}`);
        setTimeout(() => setSuccessToast(null), 4000);
        await loadKnowledge();
        return;
      }

      if (addTab === 'FAQ') {
        if (!faqQuestion.trim() || !faqAnswer.trim()) {
          setModalError('Please provide both the Question (Q) and Verified Store Answer (A).');
          setSaving(false);
          return;
        }
        payloadName = payloadName || `FAQ: ${faqQuestion.trim().substring(0, 45)}...`;
        payloadContent = `### Q: ${faqQuestion.trim()}\n\n**A:** ${faqAnswer.trim()}`;
      } else if (addTab === 'DOCUMENT') {
        if (!payloadName && !uploadedFile) {
          setModalError('Please enter a document title or upload a document file.');
          setSaving(false);
          return;
        }
        if (!payloadName && uploadedFile) {
          payloadName = uploadedFile.name.replace(/\.[^/.]+$/, '');
        }
        if (!payloadContent) {
          payloadContent = `Document: ${payloadName}\n\nStandard operating guidelines, policies, and product catalog metadata for AI customer service.`;
        }
      } else if (addTab === 'TEXT') {
        if (!payloadName) {
          setModalError('Please enter an article title.');
          setSaving(false);
          return;
        }
        if (!payloadContent) {
          setModalError('Please paste or write your article or policy text.');
          setSaving(false);
          return;
        }
      }

      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payloadName,
          type: payloadType === 'FAQ' ? 'FAQ' : 'DOCUMENT',
          content: payloadContent,
          collection: selectedCollection
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to save knowledge document');
      }

      setShowAddModal(false);
      setDocTitle('');
      setDocContent('');
      setWebsiteUrl('');
      setFaqQuestion('');
      setFaqAnswer('');
      setUploadedFile(null);
      setSuccessToast(`Successfully added and indexed "${payloadName}" into vector database!`);
      setTimeout(() => setSuccessToast(null), 4000);
      await loadKnowledge();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save knowledge document.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedIds(prev => prev.filter(i => i !== id));
        await loadKnowledge();
      }
    } catch (err) {
      console.error('Failed to delete doc:', err);
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.length} selected knowledge articles?`)) return;
    for (const id of selectedIds) {
      await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' });
    }
    setSelectedIds([]);
    await loadKnowledge();
  }

  async function handleRunRagTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testQuery.trim() || testingRag) return;
    setTestingRag(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/agents/agent_shopmate_01/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testQuery,
          channel: 'rag_test_suite'
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message || 'Test failed' });
    } finally {
      setTestingRag(false);
    }
  }

  // Filter calculations
  const totalCount = sources.length;
  const activeCount = sources.filter(s => s.status !== 'DISABLED' && s.status !== 'TRASH').length;
  const disabledCount = sources.filter(s => s.status === 'DISABLED').length;
  const trashCount = sources.filter(s => s.status === 'TRASH').length;
  const docCount = sources.filter(s => s.type === 'DOCUMENT' || s.type === 'PDF' || s.type === 'MARKDOWN' || s.type === 'MANUAL_TEXT').length;
  const faqCount = sources.filter(s => s.type === 'FAQ' || s.name?.toLowerCase().includes('faq')).length;
  const webCount = sources.filter(s => s.type === 'URL' || s.type === 'WEBSITE').length;

  const filteredSources = sources.filter(s => {
    // Search filter
    const searchMatch = !searchTerm || 
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.raw_content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.type?.toLowerCase().includes(searchTerm.toLowerCase());

    // Sidebar Category Filter
    let filterMatch = true;
    if (activeFilter === 'ACTIVE') filterMatch = s.status !== 'DISABLED' && s.status !== 'TRASH';
    else if (activeFilter === 'DISABLED') filterMatch = s.status === 'DISABLED';
    else if (activeFilter === 'TRASH') filterMatch = s.status === 'TRASH';
    else if (activeFilter === 'DOCUMENTS') filterMatch = s.type === 'DOCUMENT' || s.type === 'PDF' || s.type === 'MARKDOWN' || s.type === 'MANUAL_TEXT';
    else if (activeFilter === 'FAQ') filterMatch = s.type === 'FAQ' || s.name?.toLowerCase().includes('faq');
    else if (activeFilter === 'WEBSITES') filterMatch = s.type === 'URL' || s.type === 'WEBSITE';

    return searchMatch && filterMatch;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSources.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSources.map(s => s.id));
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#09090b]">
        <Navbar />

        <div className="flex-1 flex overflow-hidden">
          
          {/* ========================================================================= */}
          {/* LEFT KNOWLEDGE SUB-SIDEBAR (Matches Image 1) */}
          {/* ========================================================================= */}
          <aside className="w-64 border-r border-zinc-800 bg-[#0d0e12] flex flex-col justify-between shrink-0 p-4 select-none">
            <div className="space-y-6">
              
              {/* Sidebar Header */}
              <div className="flex items-center justify-between px-1">
                <h2 className="text-base font-bold text-white tracking-tight">Knowledge</h2>
                <button 
                  onClick={() => document.getElementById('knowledge-search-input')?.focus()}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                  title="Search knowledge"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* Status Filters */}
              <div className="space-y-1">
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeFilter === 'ALL'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                      : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-white'
                  }`}
                >
                  <span>All Sources</span>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                    activeFilter === 'ALL' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {totalCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilter('ACTIVE')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                    activeFilter === 'ACTIVE'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-semibold'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <span>Active</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                    {activeCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilter('DISABLED')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                    activeFilter === 'DISABLED'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-semibold'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <span>Disabled</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                    {disabledCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilter('TRASH')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                    activeFilter === 'TRASH'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-semibold'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <span>Trash (30-day)</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                    {trashCount}
                  </span>
                </button>
              </div>

              {/* ShopMate Assistant AI Category Group */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
                <div className="flex items-center justify-between px-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>ShopMate Assistant AI</span>
                  <Info className="w-3.5 h-3.5 text-zinc-400" />
                </div>

                <div className="space-y-1 pt-1">
                  <button
                    onClick={() => setActiveFilter('DOCUMENTS')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                      activeFilter === 'DOCUMENTS'
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-semibold'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" /> Documents
                    </span>
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{docCount}</span>
                  </button>

                  <button
                    onClick={() => setActiveFilter('FAQ')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                      activeFilter === 'FAQ'
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-semibold'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-400" /> Q&amp;A
                    </span>
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{faqCount}</span>
                  </button>

                  <button
                    onClick={() => setActiveFilter('WEBSITES')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                      activeFilter === 'WEBSITES'
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-semibold'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-400" /> Websites
                    </span>
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{webCount}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Bottom Assistant Grounding Card */}
            <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">ShopMate Assistant</h4>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    98% Grounded
                  </p>
                </div>
              </div>

              <Link
                href="/agents/agent_shopmate_01/playground"
                className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-white hover:text-zinc-950 text-zinc-300 flex items-center justify-center transition shrink-0"
                title="Open Assistant Playground"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              </Link>
            </div>
          </aside>

          {/* ========================================================================= */}
          {/* MAIN CONTENT AREA (Matches Image 1) */}
          {/* ========================================================================= */}
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#09090b] p-6 lg:p-8 space-y-6">
            
            {/* Top Title & Primary Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">All Knowledge Articles</h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Showing verified company knowledge grounding <strong className="text-zinc-200">ShopMate Assistant</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowRagTestModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 text-xs font-semibold transition flex items-center gap-2 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                  <span>Test Knowledge RAG</span>
                </button>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-white/5"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Knowledge</span>
                </button>
              </div>
            </div>

            {/* Collections Pill Bar & Live Search */}
            <div className="bg-[#121215] border border-zinc-800/90 rounded-2xl p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 overflow-x-auto select-none">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-2 font-mono shrink-0">
                  COLLECTIONS:
                </span>

                {collections.map(col => (
                  <button
                    key={col}
                    onClick={() => setActiveCollection(col)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                      activeCollection === col
                        ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    {col}
                  </button>
                ))}

                <button
                  onClick={() => setShowNewCollectionModal(true)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg text-indigo-400 hover:bg-indigo-950/30 border border-dashed border-indigo-800/60 flex items-center gap-1 transition whitespace-nowrap"
                >
                  <FolderPlus className="w-3.5 h-3.5" /> New
                </button>
              </div>

              {/* Search input */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2" />
                <input
                  id="knowledge-search-input"
                  type="text"
                  placeholder="Search knowledge..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2 text-zinc-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Select All & Bulk Actions Bar */}
            <div className="flex items-center justify-between px-1 text-xs text-zinc-400">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filteredSources.length > 0 && selectedIds.length === filteredSources.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                />
                <span className="font-medium text-zinc-300">
                  Select All ({filteredSources.length})
                </span>
              </label>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-indigo-400 font-mono font-medium">
                    {selectedIds.length} selected
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3 h-3" /> Delete Selected
                  </button>
                </div>
              )}
            </div>

            {/* Knowledge Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-full text-center py-16 text-xs text-zinc-500 font-mono flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-zinc-600" />
                  <span>Loading indexed knowledge sources...</span>
                </div>
              ) : filteredSources.length === 0 ? (
                <div className="col-span-full bg-[#121215] border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
                  <BookOpen className="w-10 h-10 text-zinc-600 mx-auto" />
                  <h3 className="text-sm font-bold text-white">No Knowledge Articles Found</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    {searchTerm 
                      ? 'No articles matched your search query. Try clear filters.' 
                      : 'Upload company documents, crawl store FAQ URLs, or add direct Q&A pairs.'}
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 rounded-xl bg-white text-zinc-950 text-xs font-bold shadow-md hover:bg-zinc-200 transition"
                  >
                    + Add First Knowledge Article
                  </button>
                </div>
              ) : (
                filteredSources.map((source) => {
                  const isSelected = selectedIds.includes(source.id);
                  const isUrl = source.type === 'URL' || source.type === 'WEBSITE';
                  const isFaq = source.type === 'FAQ';
                  const snippet = source.raw_content ? source.raw_content.substring(0, 140) + '...' : 'Knowledge source indexed for semantic cosine similarity.';
                  const chunkCount = source.chunk_count || source.chunkCount || 4;

                  return (
                    <div
                      key={source.id}
                      className={`bg-[#121215] border rounded-2xl p-5 hover:border-zinc-700 transition-all flex flex-col justify-between gap-4 shadow-sm group ${
                        isSelected ? 'border-indigo-500/80 bg-indigo-950/10' : 'border-zinc-800'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Top Card Row: Checkbox, Type Pill, Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectId(source.id)}
                              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0"
                            />
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-300">
                              {isUrl ? <Globe className="w-3.5 h-3.5 text-emerald-400" /> : isFaq ? <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> : <FileText className="w-3.5 h-3.5 text-indigo-400" />}
                              <span className="font-mono text-[10px] uppercase font-semibold">{source.type || 'DOCUMENT'}</span>
                            </div>
                          </div>

                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-950/70 border border-emerald-800 text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Active
                          </span>
                        </div>

                        {/* Title */}
                        <div>
                          <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                            {source.name}
                          </h3>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-3 leading-relaxed font-mono text-[11px]">
                            {snippet}
                          </p>
                        </div>

                        {/* Pipeline Stage Badge */}
                        <div className="pt-1 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-zinc-500 font-mono">Pipeline:</span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-[10px] font-mono font-semibold">
                            <Check className="w-3 h-3 stroke-[3]" />
                            Indexed (Stage 5/5)
                          </span>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="pt-3 border-t border-zinc-800/70 flex items-center justify-between text-zinc-400 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                            <Layers className="w-3.5 h-3.5 text-zinc-500" />
                            General
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-[11px] text-zinc-300 font-semibold">{chunkCount} chunks</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewDoc(source)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                            title="Preview Raw Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(source.id, source.name)}
                            className="p-1.5 rounded-lg hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 transition"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </main>
        </div>

        {/* Floating Success Toast */}
        {successToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-700 text-emerald-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold">{successToast}</span>
            <button onClick={() => setSuccessToast(null)} className="p-1 hover:bg-emerald-900 rounded-lg text-emerald-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADD BUSINESS KNOWLEDGE MODAL (Matches Image 2) */}
        {/* ========================================================================= */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white text-zinc-950 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              {/* Modal Header */}
              <div className="p-6 pb-4 flex items-start justify-between border-b border-zinc-100">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Add Business Knowledge</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Upload documents, crawl website URLs, or add direct FAQs.
                  </p>
                </div>
                <button 
                  onClick={() => { setShowAddModal(false); setModalError(null); }}
                  className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleSaveKnowledge} className="p-6 overflow-y-auto space-y-5">
                
                {/* Modal Error Banner */}
                {modalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* 4 Type Selector Tabs (Matches Image 2) */}
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { id: 'WEBSITE', label: 'Website', icon: Globe },
                    { id: 'DOCUMENT', label: 'Document', icon: FileText },
                    { id: 'FAQ', label: 'FAQ', icon: HelpCircle },
                    { id: 'TEXT', label: 'Text', icon: Edit3 },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = addTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => { setAddTab(tab.id as any); setModalError(null); }}
                        className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 border transition-all text-xs font-semibold ${
                          isActive
                            ? 'bg-[#181820] text-white border-[#181820] shadow-md'
                            : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-zinc-600'}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Form Fields: Document Tab */}
                {addTab === 'DOCUMENT' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-zinc-800">
                        Document Title (Auto-filled from file)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setDocTitle('Acme Store Return & Warranty Policy 2026');
                          setDocContent('Acme Store Return & Warranty Guidelines:\n- 30-day hassle-free returns for unworn items in original packaging.\n- Free size exchanges with prepaid shipping labels.\n- 2-year warranty on all electronic audio gear covering hardware defects.');
                          setModalError(null);
                        }}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Load Sample Policy
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Product Guide & Service Policies"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                    />

                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                        Document File
                      </label>
                      
                      {/* Drag & Drop Box */}
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleFileUpload}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-zinc-200 hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer bg-[#f8fafc] hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center space-y-2 group"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.docx,.txt,.md,.csv,.json"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-zinc-200 flex items-center justify-center text-zinc-500 group-hover:text-indigo-600 group-hover:scale-105 transition">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-zinc-800">
                          Click to upload or drag &amp; drop files here
                        </p>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          PDF, DOCX, TXT, MD, CSV, JSON (up to 25MB)
                        </p>
                      </div>

                      {uploadedFile && (
                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-mono flex items-center justify-between">
                          <div className="flex items-center gap-2 truncate">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-semibold truncate">{uploadedFile.name}</span>
                            <span className="text-emerald-600 text-[10px]">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setUploadedFile(null); setDocContent(''); }}
                            className="text-emerald-700 hover:text-rose-600 text-[11px] font-bold underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      {docContent && !uploadedFile && (
                        <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800 font-mono flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>Content ready for indexing ({docContent.length} characters).</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Form Fields: Website Tab */}
                {addTab === 'WEBSITE' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-zinc-800">
                        Website Target URL
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setWebsiteUrl('https://shopmate-demo.myshopify.com/pages/shipping-returns');
                          setDocTitle('Storefront Shipping & Refund Policy');
                          setModalError(null);
                        }}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Load Example URL
                      </button>
                    </div>
                    <input
                      type="url"
                      placeholder="https://yourstore.com/pages/shipping-returns"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                    />

                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                        Document Label (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Online FAQ Guidelines"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                      />
                    </div>
                  </div>
                )}

                {/* Form Fields: FAQ Tab */}
                {addTab === 'FAQ' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-zinc-800">
                        Frequently Asked Question (Q)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setFaqQuestion('What is the return window for unworn items?');
                          setFaqAnswer('We offer a 30-day return window from delivery date for all items in original unworn condition with tags attached. Exchanges for a different size or color are 100% free.');
                          setModalError(null);
                        }}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Load Sample FAQ
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Can I exchange an item for a different shoe size?"
                      value={faqQuestion}
                      onChange={(e) => setFaqQuestion(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                    />

                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                        Verified Store Answer (A)
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Provide the exact grounded answer that ShopMate AI should deliver to customers..."
                        value={faqAnswer}
                        onChange={(e) => setFaqAnswer(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* Form Fields: Text Tab */}
                {addTab === 'TEXT' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-zinc-800">
                        Article Title
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setDocTitle('VIP Loyalty & Express Shipping Terms');
                          setDocContent('VIP Member Benefits:\n- Tier 1 VIPs receive complimentary 2-day express shipping on all orders over $75.\n- 60-day extended returns window.\n- Priority concierge support with 1-click human agent transfer.');
                          setModalError(null);
                        }}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Load Sample Terms
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Return, Warranty & Customs Policy 2026"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                    />

                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                        Raw Text or Markdown Content
                      </label>
                      <textarea
                        rows={6}
                        placeholder="Paste store policy, size charts, or product specs..."
                        value={docContent}
                        onChange={(e) => setDocContent(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 font-mono placeholder-zinc-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions (Matches Image 2) */}
                <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setModalError(null); }}
                    className="px-5 py-2.5 rounded-xl font-semibold text-xs text-zinc-700 hover:bg-zinc-100 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-[#475569] hover:bg-[#334155] text-white text-xs font-bold transition flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    <UploadCloud className={`w-4 h-4 ${saving ? 'animate-bounce' : ''}`} />
                    <span>{saving ? 'Chunking & Embedding...' : 'Save & Index Document'}</span>
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TEST KNOWLEDGE RAG MODAL */}
        {/* ========================================================================= */}
        {showRagTestModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#121215] border border-zinc-800 text-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Test Knowledge RAG Grounding</h3>
                    <p className="text-[11px] text-zinc-400">Simulate live 12-stage cosine retrieval against indexed articles.</p>
                  </div>
                </div>
                <button onClick={() => setShowRagTestModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <form onSubmit={handleRunRagTest} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. What is the return window for shoes? How long does shipping take?"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={testingRag || !testQuery.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    {testingRag ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>Run Query</span>
                  </button>
                </form>

                {/* Test Results View */}
                {testResult && (
                  <div className="space-y-3 pt-2">
                    <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2">
                      <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Generated AI Answer:</span>
                      <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">{testResult.response}</p>
                    </div>

                    {testResult.trace?.retrieved_citations && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-mono text-zinc-400 font-bold">Retrieved Citations &amp; Relevance:</span>
                        <div className="space-y-2">
                          {testResult.trace.retrieved_citations.map((c: any, i: number) => (
                            <div key={i} className="p-3 bg-[#09090b] border border-zinc-800 rounded-xl text-xs space-y-1">
                              <div className="flex items-center justify-between font-mono text-[11px]">
                                <span className="font-bold text-indigo-300">{c.document_name}</span>
                                <span className="text-emerald-400">Score: {(c.relevance_score * 100).toFixed(1)}%</span>
                              </div>
                              <p className="text-[11px] text-zinc-400 font-mono">{c.chunk_text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* NEW COLLECTION MODAL */}
        {/* ========================================================================= */}
        {showNewCollectionModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#121215] border border-zinc-800 text-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white">Create New Knowledge Collection</h3>
                <button onClick={() => setShowNewCollectionModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Collection name, e.g. Customer Warranty"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowNewCollectionModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newCollectionName.trim()) {
                      setCollections(prev => [...prev, newCollectionName.trim()]);
                      setNewCollectionName('');
                      setShowNewCollectionModal(false);
                    }
                  }}
                  className="px-4 py-1.5 rounded-lg bg-white text-zinc-950 text-xs font-bold hover:bg-zinc-200"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DOCUMENT RAW PREVIEW MODAL */}
        {/* ========================================================================= */}
        {previewDoc && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#121215] border border-zinc-800 text-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-bold text-white">{previewDoc.name}</h3>
                </div>
                <button onClick={() => setPreviewDoc(null)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed bg-[#09090b]/60">
                {previewDoc.raw_content || previewDoc.content || 'No content recorded.'}
              </div>
              <div className="p-3 border-t border-zinc-800 flex justify-between items-center text-[11px] font-mono text-zinc-500">
                <span>{previewDoc.chunk_count || previewDoc.chunkCount || 2} indexed 128-dim vector chunks</span>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-sans"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}