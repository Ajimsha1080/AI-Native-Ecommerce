import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, EyeOff } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-bold tracking-tight text-white">Privacy & Data Policy</h1>
          </div>
          <p className="text-sm text-slate-400">Last updated: September 2026 | Enterprise Multi-Tenant Privacy Standard</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-slate-300">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">1. Multi-Tenant Data Isolation</h2>
            <p>
              ShopMate enforces strict cryptographic and query-level isolation between tenant workspaces. No knowledge documents, catalog listings, or customer chat records are ever shared across workspace boundaries or used to train third-party foundation models.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">2. Customer PII Masking & Order Privacy</h2>
            <p>
              Order lookups automatically mask personal identifiers (shipping addresses, payment details, phone numbers) before returning traces to shoppers or agents. Only authorized team members with appropriate RBAC roles can view unmasked records in the admin dashboard.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">3. Cookies & Session Security</h2>
            <p>
              We use <code className="text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded">HttpOnly; SameSite=Lax; Secure</code> session cookies for platform authentication. No sensitive access tokens or plaintext credentials are exposed to client-side scripts.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">4. GDPR / CCPA Compliance & Data Portability</h2>
            <p>
              Tenants retain full ownership of their data. You may request a complete JSON export of all workspace data at any time via the Tenant Export endpoint or request immediate permanent deletion.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">5. Sub-processors & Cloud Infrastructure</h2>
            <p>
              We partner with enterprise cloud providers for hosting and database storage. AI model inferences are processed in isolated memory without persistent retention by model providers.
            </p>
          </section>
        </div>

        <div className="border-t border-slate-800 pt-6 text-xs text-slate-500 flex justify-between">
          <p>© 2026 ShopMate Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-slate-400 underline">Terms of Service</Link>
            <Link href="/dashboard" className="hover:text-slate-400 underline">Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
