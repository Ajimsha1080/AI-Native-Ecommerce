'use client';

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { FileText, Shield, Clock, Search } from 'lucide-react';
import Link from 'next/link';

export default function AuditLogsSettingsPage() {
  const [logs] = useState([
    { id: 'log_1', action: 'AGENT_DEPLOYED', target: 'Shoe Assistant v1.0', user: 'merchant@shopmate.com', ip: '192.168.1.1', time: '10 minutes ago' },
    { id: 'log_2', action: 'KNOWLEDGE_SYNCED', target: 'Return Policy 2026', user: 'merchant@shopmate.com', ip: '192.168.1.1', time: '1 hour ago' },
    { id: 'log_3', action: 'API_KEY_CREATED', target: 'Mobile iOS Token', user: 'merchant@shopmate.com', ip: '192.168.1.1', time: '3 hours ago' },
    { id: 'log_4', action: 'POLICY_MODIFIED', target: 'Safety Guardrails', user: 'admin@aaas-platform.com', ip: '10.0.0.1', time: '1 day ago' }
  ]);

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border-b border-zinc-800 pb-5">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-zinc-400" />
                Immutable Audit Trails
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Full compliance record of administrative actions, config changes, and role assignments.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 border-b border-zinc-800 pb-2 overflow-x-auto">
              <Link href="/settings" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                General
              </Link>
              <Link href="/billing" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                Billing &amp; Quotas
              </Link>
              <Link href="/analytics" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                Store Analytics
              </Link>
              <Link href="/api-keys" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                API Keys
              </Link>
              <Link href="/settings/members" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                Team Members
              </Link>
              <Link href="/settings/security" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                Security &amp; RBAC
              </Link>
              <Link href="/settings/audit-logs" className="px-3 py-1 text-xs font-semibold rounded-lg bg-zinc-800 text-white whitespace-nowrap">
                Audit Logs
              </Link>
            </div>

            <div className="bg-[#121215] border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
              <div className="p-3.5 bg-[#09090b] text-[11px] font-mono text-zinc-400 grid grid-cols-12">
                <span className="col-span-3">ACTION</span>
                <span className="col-span-4">TARGET RESOURCE</span>
                <span className="col-span-3">INITIATED BY</span>
                <span className="col-span-2 text-right">TIMESTAMP</span>
              </div>

              {logs.map((log) => (
                <div key={log.id} className="p-3.5 text-xs grid grid-cols-12 items-center hover:bg-zinc-800/30 transition">
                  <span className="col-span-3 font-mono font-semibold text-zinc-300 text-[11px]">{log.action}</span>
                  <span className="col-span-4 text-zinc-200 font-medium">{log.target}</span>
                  <span className="col-span-3 text-zinc-400 font-mono text-[11px]">{log.user}</span>
                  <span className="col-span-2 text-right text-zinc-500 font-mono text-[11px]">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}