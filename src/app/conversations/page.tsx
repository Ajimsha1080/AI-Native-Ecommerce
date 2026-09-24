'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { 
  MessageSquare, Search, Filter, Bot, User, Clock, CheckCircle, 
  ChevronRight, Sparkles, Send, ShieldAlert, ShoppingBag, ArrowRight,
  Headphones, RefreshCw
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { fetchWithCache, getClientCachedData, setClientCachedData } from '@/lib/client-cache';

export default function ConversationsWorkspacePage() {
  const cachedConvos = getClientCachedData<{ conversations: any[] }>('/api/conversations')?.conversations || [];
  const [conversations, setConversations] = useState<any[]>(() => cachedConvos);
  const [selectedConvo, setSelectedConvo] = useState<any | null>(() => cachedConvos[0] || null);
  const [messages, setMessages] = useState<any[]>(() => cachedConvos[0]?.messages || []);
  const [loading, setLoading] = useState(cachedConvos.length === 0);
  const [liveSync, setLiveSync] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetchConversations(conversations.length === 0);

    // Real-Time live synchronization interval (every 3.5s)
    const interval = setInterval(() => {
      if (liveSync) {
        syncLiveConversations();
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [liveSync, selectedConvo?.id]);

  async function fetchConversations(isInitial = false) {
    if (isInitial && conversations.length === 0) setLoading(true);
    try {
      const data = await fetchWithCache<{ conversations: any[] }>('/api/conversations');
      const convos = data?.conversations || [];
      setConversations(convos);
      if (isInitial && convos.length > 0 && !selectedConvo) {
        selectConversation(convos[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }

  async function syncLiveConversations() {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        const convos = data.conversations || [];
        setConversations(convos);
        if (selectedConvo?.id) {
          const msgRes = await fetch(`/api/conversations/${selectedConvo.id}`);
          if (msgRes.ok) {
            const msgData = await msgRes.json();
            if (Array.isArray(msgData.messages)) {
              setMessages(msgData.messages);
            }
          }
        }
      }
    } catch {}
  }

  async function selectConversation(convo: any) {
    setSelectedConvo(convo);
    try {
      const res = await fetch(`/api/conversations/${convo.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load messages for conversation:', err);
    }
  }

  async function handleTakeover(status: 'HUMAN_TAKEOVER' | 'ACTIVE' | 'RESOLVED') {
    if (!selectedConvo) return;
    try {
      const res = await fetch(`/api/conversations/${selectedConvo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated = { ...selectedConvo, status };
        setSelectedConvo(updated);
        setConversations(conversations.map(c => c.id === updated.id ? updated : c));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvo || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/conversations/${selectedConvo.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'HUMAN',
          content: replyText,
          metadata: { humanHandoff: true, operator: 'Staff Agent' }
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
        }
        setReplyText('');
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSendingReply(false);
    }
  }

  const filteredConversations = conversations.filter(c => {
    const idStr = String(c.id || '').toLowerCase();
    const channelStr = String(c.channel || '').toLowerCase();
    const agentStr = String(c.agent_id || c.agentId || '').toLowerCase();
    const customerStr = String(c.customer_identifier || c.customerIdentifier || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase().trim();

    const matchesSearch = !searchLower || 
      idStr.includes(searchLower) || 
      channelStr.includes(searchLower) || 
      agentStr.includes(searchLower) || 
      customerStr.includes(searchLower);

    const isMatchStatus = 
      statusFilter === 'ALL' ||
      c.status === statusFilter ||
      (statusFilter === 'ACTIVE' && (c.status === 'ACTIVE' || c.status === 'OPEN')) ||
      (statusFilter === 'HUMAN_TAKEOVER' && c.status === 'HUMAN_TAKEOVER') ||
      (statusFilter === 'RESOLVED' && c.status === 'RESOLVED');

    return matchesSearch && isMatchStatus;
  });

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-zinc-800 selection:text-zinc-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <div className="flex-1 flex min-h-0">
          {/* Conversation List Pane */}
          <div className="w-80 md:w-96 border-r border-zinc-800 flex flex-col bg-[#09090b]">
            <div className="p-4 border-b border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-zinc-400" />
                  Live Support Inbox
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLiveSync(!liveSync)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1.5 transition ${
                      liveSync 
                        ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-400 font-semibold' 
                        : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                    }`}
                    title="Toggle Real-Time Background Synchronization"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${liveSync ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`}></span>
                    <span>{liveSync ? 'LIVE SYNC' : 'PAUSED'}</span>
                  </button>
                  <button
                    onClick={() => fetchConversations(true)}
                    className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                    title="Refresh conversations"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter sessions by ID or agent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#121215] border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-[#121215] border border-zinc-800 rounded-lg p-1 text-xs">
                {[
                  { id: 'ALL', label: 'ALL' },
                  { id: 'ACTIVE', label: 'ACTIVE' },
                  { id: 'HUMAN_TAKEOVER', label: 'TAKEOVER' },
                  { id: 'RESOLVED', label: 'RESOLVED' }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={`flex-1 py-1 rounded font-mono text-[10px] font-semibold uppercase transition ${
                      statusFilter === st.id ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of sessions */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40">
              {loading ? (
                <div className="p-8 text-center text-xs text-zinc-500 font-mono flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-600" />
                  <span>Loading sessions...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 font-mono">No conversations matching filters.</div>
              ) : (
                filteredConversations.map((convo) => {
                  const isSelected = selectedConvo?.id === convo.id;
                  const dateVal = convo.updated_at || convo.updatedAt || convo.created_at || convo.createdAt || Date.now();
                  return (
                    <button
                      key={convo.id}
                      onClick={() => selectConversation(convo)}
                      className={`w-full text-left p-3.5 transition flex flex-col gap-1.5 border-l-2 ${
                        isSelected 
                          ? 'bg-zinc-800/70 border-indigo-500 shadow-sm' 
                          : 'border-transparent hover:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-zinc-200 truncate max-w-[170px]">{convo.id}</span>
                        <StatusBadge status={convo.status || 'ACTIVE'} size="sm" />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                        <span className="truncate">Agent: {convo.agent_id || convo.agentId || 'ShopMate AI'}</span>
                        <span className="flex items-center gap-1 text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {new Date(dateVal).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Stream & Details Pane */}
          {selectedConvo ? (
            <div className="flex-1 flex flex-col bg-[#09090b]">
              {/* Header */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#121215]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                      <span className="font-mono">{selectedConvo.id}</span>
                      <StatusBadge status={selectedConvo.status || 'ACTIVE'} size="sm" />
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Channel: {selectedConvo.channel || 'PLAYGROUND'} • Agent: {selectedConvo.agent_id || selectedConvo.agentId || 'ShopMate AI'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedConvo.status !== 'HUMAN_TAKEOVER' ? (
                    <button
                      onClick={() => handleTakeover('HUMAN_TAKEOVER')}
                      className="px-3 py-1.5 rounded-lg bg-amber-950/70 text-amber-300 border border-amber-800/60 hover:bg-amber-900/60 text-xs font-medium transition flex items-center gap-1.5 shadow-md"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Take Over Session
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTakeover('ACTIVE')}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 text-xs font-medium transition flex items-center gap-1.5 shadow-md"
                    >
                      <Bot className="w-3.5 h-3.5" /> Return to AI
                    </button>
                  )}
                  <button
                    onClick={() => handleTakeover('RESOLVED')}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium transition flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Resolve
                  </button>
                </div>
              </div>

              {/* Message Transcript */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-zinc-500 font-mono">No messages recorded in this session.</div>
                ) : (
                  messages.map((m) => {
                    const isUserRole = m.role?.toLowerCase() === 'user';
                    const isHumanHandoff = m.role?.toUpperCase() === 'HUMAN';
                    const msgTime = m.created_at || m.createdAt || Date.now();
                    return (
                      <div
                        key={m.id}
                        className={`flex items-start gap-3 ${isUserRole ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                            isUserRole
                              ? 'bg-zinc-700 text-zinc-100 font-bold'
                              : isHumanHandoff
                              ? 'bg-amber-900/80 text-amber-300 border border-amber-700'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}
                        >
                          {isUserRole ? <User className="w-3.5 h-3.5" /> : isHumanHandoff ? <Headphones className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                        </div>

                        <div className={`flex flex-col gap-1 max-w-xl ${isUserRole ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                            <span className="font-medium text-zinc-400">
                              {isUserRole ? 'Customer' : isHumanHandoff ? 'Human Operator' : 'ShopMate AI'}
                            </span>
                            <span>•</span>
                            <span>{new Date(msgTime).toLocaleTimeString('en-US')}</span>
                          </div>
                          <div
                            className={`p-3.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                              isUserRole
                                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-tr-none'
                                : isHumanHandoff
                                ? 'bg-amber-950/40 border border-amber-800/80 text-amber-100 rounded-tl-none'
                                : 'bg-[#121215] border border-zinc-800 text-zinc-200 rounded-tl-none'
                            }`}
                          >
                            {m.content}
                          </div>

                          {/* Display metadata if any */}
                          {m.metadata?.products && (
                            <div className="mt-1 bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-[11px] text-zinc-400 font-mono">
                              📦 Recommended {m.metadata.products.length} product(s)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Takeover Reply Box */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-zinc-800 bg-[#121215] flex gap-2">
                <input
                  type="text"
                  placeholder={selectedConvo.status === 'HUMAN_TAKEOVER' ? "Type human operator response..." : "Take over session to send manual response..."}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sendingReply}
                  className="px-4 py-2 bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold rounded-lg transition disabled:opacity-40 flex items-center gap-1.5 shadow-md"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8 text-zinc-500 text-xs font-mono">
              Select a session from the list to view transcript and manage human handoff.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}