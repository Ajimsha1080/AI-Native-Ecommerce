import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, EyeOff } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f4f5f7] text-zinc-900 py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased selection:bg-zinc-200 selection:text-zinc-900">
      <div className="max-w-4xl mx-auto space-y-8 bg-white border border-zinc-200 p-8 rounded-2xl shadow-2xs">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="border-b border-zinc-200 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Privacy &amp; Data Policy</h1>
          </div>
          <p className="text-xs text-zinc-500">Last updated: September 2026 | Enterprise Multi-Tenant Privacy Standard</p>
        </div>

        <div className="space-y-6 text-xs leading-relaxed text-zinc-600">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900">1. Multi-Tenant Data Isolation</h2>
            <p>
              ShopMate enforces strict cryptographic and query-level isolation between tenant workspaces. No knowledge documents, catalog listings, or customer chat records are ever shared across workspace boundaries or used to train third-party foundation models.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900">2. Customer PII Masking &amp; Order Privacy</h2>
            <p>
              Order lookups automatically mask personal identifiers (shipping addresses, payment details, phone numbers) before returning traces to shoppers or agents. Only authorized team members with appropriate RBAC roles can view unmasked records in the admin dashboard.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900">3. Cookies &amp; Session Security</h2>
            <p>
              We use <code className="text-zinc-900 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded-md font-mono">HttpOnly; SameSite=Lax; Secure</code> session cookies for platform authentication. No sensitive access tokens or plaintext credentials are exposed to client-side scripts.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900">4. GDPR / CCPA Compliance &amp; Data Portability</h2>
            <p>
              Tenants retain full ownership of their data. You may request a complete JSON export of all workspace data at any time via the Tenant Export endpoint or request immediate permanent deletion.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900">5. Sub-processors &amp; Cloud Infrastructure</h2>
            <p>
              We partner with enterprise cloud providers for hosting and database storage. AI model inferences are processed in isolated memory without persistent retention by model providers.
            </p>
          </section>
        </div>

        <div className="border-t border-zinc-200 pt-6 text-xs text-zinc-400 flex justify-between">
          <p>© 2026 ShopMate Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-zinc-900 underline font-medium">Terms of Service</Link>
            <Link href="/dashboard" className="hover:text-zinc-900 underline font-medium">Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
