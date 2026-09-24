'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, LayoutDashboard, Building2, Users, Cpu, 
  DollarSign, Database, HardDriveDownload, Layers, Wrench, 
  MessageSquare, BarChart3, Tag, CreditCard, Activity, 
  AlertOctagon, ShieldCheck, FileText, Flag, Settings, 
  ArrowLeft, Bot, Lock
} from 'lucide-react';

interface SuperAdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function SuperAdminSidebar({ activeTab, setActiveTab }: SuperAdminSidebarProps) {
  const navSections = [
    {
      title: 'PLATFORM MANAGEMENT',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'tenants', label: 'Tenants', icon: Building2 },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'plans', label: 'Plans & Limits', icon: Tag },
        { id: 'billing', label: 'Billing & MRR', icon: CreditCard },
      ]
    },
    {
      title: 'AI & INTELLIGENCE',
      items: [
        { id: 'ai-models', label: 'AI & Models', icon: Cpu },
        { id: 'ai-cost', label: 'AI Usage & Cost', icon: DollarSign },
        { id: 'rag-ops', label: 'RAG Operations', icon: Database },
        { id: 'indexing', label: 'Indexing & Knowledge', icon: HardDriveDownload },
      ]
    },
    {
      title: 'ECOSYSTEM & ACTIONS',
      items: [
        { id: 'integrations', label: 'Integrations', icon: Layers },
        { id: 'agent-actions', label: 'Agent Actions', icon: Wrench },
        { id: 'conversations', label: 'Conversations Monitor', icon: MessageSquare },
        { id: 'analytics', label: 'Platform Analytics', icon: BarChart3 },
      ]
    },
    {
      title: 'INFRASTRUCTURE & OPS',
      items: [
        { id: 'system-health', label: 'System Health', icon: Activity },
        { id: 'logs', label: 'Logs & Errors', icon: AlertOctagon },
        { id: 'security', label: 'Security & Access', icon: ShieldCheck },
        { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
        { id: 'feature-flags', label: 'Feature Flags', icon: Flag },
        { id: 'settings', label: 'Platform Settings', icon: Settings },
      ]
    }
  ];

  return (
    <aside className="w-64 border-r border-zinc-200 bg-white flex flex-col justify-between shrink-0 select-none overflow-y-auto">
      <div className="flex flex-col">
        {/* Super Admin Top Banner */}
        <div className="h-14 px-4 border-b border-zinc-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-xs">
              <ShieldAlert className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-zinc-900 tracking-tight">SuperAdmin</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-red-50 border border-red-200 text-red-700 font-bold">
                  ROOT
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">Platform Control Plane</p>
            </div>
          </div>
        </div>

        {/* Back to Tenant App Link */}
        <div className="p-3 border-b border-zinc-200">
          <Link
            href="/dashboard"
            className="w-full px-3 py-1.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 hover:text-zinc-900 text-xs font-medium transition flex items-center justify-between shadow-2xs"
          >
            <span className="flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5 text-zinc-500" /> Switch to Tenant View
            </span>
            <Bot className="w-3.5 h-3.5 text-zinc-400" />
          </Link>
        </div>

        {/* Nav Sections */}
        <nav className="p-3 space-y-4 pt-3">
          {navSections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                {sec.title}
              </p>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-red-50 text-red-700 font-semibold shadow-2xs border border-red-100'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-red-600' : 'text-zinc-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Platform Security Badge */}
      <div className="p-3 border-t border-zinc-200 sticky bottom-0 bg-white">
        <div className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-600 flex items-center justify-between font-mono">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-red-600" />
            <span className="text-zinc-700 font-sans text-[11px] font-medium">Strict Root RBAC</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">Enforced</span>
        </div>
      </div>
    </aside>
  );
}
