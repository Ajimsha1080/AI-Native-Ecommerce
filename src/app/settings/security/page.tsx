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
    <div className="flex h-screen bg-[#f4f5f7] text-zinc-900 font-sans antialiased selection:bg-zinc-200 selection:text-zinc-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-zinc-700" />
                Security &amp; Data Privacy
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Configure customer PII sanitization, SSO enforcement, and cryptographic safeguards.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 border-b border-zinc-200 pb-2 overflow-x-auto">
              <Link href="/settings" className="px-3 py-1.5 text-xs font-semibold rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition whitespace-nowrap">
                General
              </Link>
              <Link href="/billing" className="px-3 py-1.5 text-xs font-semibold rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition whitespace-nowrap">
                Billing &amp; Quotas
              </Link>
              <Link href="/analytics" className="px-3 py-1.5 text-xs font-semibold rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition whitespace-nowrap">
                Store Analytics
              </Link>
              <Link href="/api-keys" className="px-3 py-1.5 text-xs font-semibold rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition whitespace-nowrap">
                API Keys
              </Link>
              <Link href="/settings/members" className="px-3 py-1.5 text-xs font-semibold rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition whitespace-nowrap">
                Team Members
              </Link>
              <Link href="/settings/security" className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white text-zinc-900 shadow-2xs border border-zinc-200 whitespace-nowrap">
                Security &amp; RBAC
              </Link>
              <Link href="/settings/audit-logs" className="px-3 py-1.5 text-xs font-semibold rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition whitespace-nowrap">
                Audit Logs
              </Link>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-5 shadow-2xs">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900">Automatic PII Redaction</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Mask credit card numbers, SSNs, and passwords before logging execution traces.</p>
                </div>
                <input
                  type="checkbox"
                  checked={requirePiiMasking}
                  onChange={(e) => setRequirePiiMasking(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-900 bg-white border-zinc-300 focus:ring-zinc-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900">Require Two-Factor Authentication (2FA)</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Enforce TOTP authenticator verification for all workspace team members.</p>
                </div>
                <input
                  type="checkbox"
                  checked={twoFactor}
                  onChange={(e) => setTwoFactor(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-900 bg-white border-zinc-300 focus:ring-zinc-500 cursor-pointer"
                />
              </div>

              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600">
                <span className="font-bold text-zinc-900">Enterprise Encryption:</span> All agent prompts, RAG chunk vectors, and customer conversation transcripts are isolated by Workspace ID and encrypted at rest with AES-256.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}