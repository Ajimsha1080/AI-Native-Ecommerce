'use client';

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Shield, Lock, Key, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function SecuritySettingsPage() {
  const [twoFactor, setTwoFactor] = useState(false);
  const [requirePiiMasking, setRequirePiiMasking] = useState(true);

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border-b border-zinc-800 pb-5">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-zinc-400" />
                Security & Data Privacy
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Configure customer PII sanitization, SSO enforcement, and cryptographic safeguards.
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
              <Link href="/settings/security" className="px-3 py-1 text-xs font-semibold rounded-lg bg-zinc-800 text-white whitespace-nowrap">
                Security &amp; RBAC
              </Link>
              <Link href="/settings/audit-logs" className="px-3 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition whitespace-nowrap">
                Audit Logs
              </Link>
            </div>

            <div className="bg-[#121215] border border-zinc-800 rounded-xl p-6 space-y-5 shadow-lg">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-200">Automatic PII Redaction</h3>
                  <p className="text-xs text-zinc-400">Mask credit card numbers, SSNs, and passwords before logging execution traces.</p>
                </div>
                <input
                  type="checkbox"
                  checked={requirePiiMasking}
                  onChange={(e) => setRequirePiiMasking(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-100 bg-zinc-800 border-zinc-700 focus:ring-zinc-500"
                />
              </div>

              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-200">Require Two-Factor Authentication (2FA)</h3>
                  <p className="text-xs text-zinc-400">Enforce TOTP authenticator verification for all workspace team members.</p>
                </div>
                <input
                  type="checkbox"
                  checked={twoFactor}
                  onChange={(e) => setTwoFactor(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-100 bg-zinc-800 border-zinc-700 focus:ring-zinc-500"
                />
              </div>

              <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs text-zinc-300">
                <span className="font-semibold text-zinc-100">Enterprise Encryption:</span> All agent prompts, RAG chunk vectors, and customer conversation transcripts are isolated by Workspace ID and encrypted at rest with AES-256.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}