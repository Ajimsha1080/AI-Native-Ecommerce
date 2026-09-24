import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Scale, FileText } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <Scale className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold tracking-tight text-white">Terms of Service</h1>
          </div>
          <p className="text-sm text-slate-400">Last updated: September 2026 | Effective immediately for all tenants</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-slate-300">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">1. Platform Services & Multi-Tenancy</h2>
            <p>
              ShopMate AaaS provides autonomous AI agents, semantic retrieval-augmented generation (RAG), and e-commerce tool execution for multi-tenant retail stores. By creating a tenant workspace or embedding our agent widgets, you agree to these Terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">2. AI Accuracy & Server-Side Execution</h2>
            <p>
              Our platform executes deterministic server-side arithmetic for cart calculations, discounts, and inventory validation. While agents reason autonomously, business critical operations remain bound by server rules and store policies configured in your workspace.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">3. Acceptable Use & Security Guardrails</h2>
            <p>
              You agree not to bypass tenant isolation boundaries, perform prompt injection attacks, abuse API rate limits, or reverse-engineer the proprietary 12-stage RAG engine.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">4. Subscriptions, Upgrades & Cancellations</h2>
            <p>
              Billing tiers (Growth, Enterprise) renew on a monthly or annual basis via Stripe or Razorpay. Subscriptions may be cancelled at any time through the Billing settings.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">5. Termination & Data Deletion</h2>
            <p>
              Workspace owners may export full tenant archives or permanently delete all workspace agents, knowledge documents, and traces via our GDPR-compliant endpoints.
            </p>
          </section>
        </div>

        <div className="border-t border-slate-800 pt-6 text-xs text-slate-500 flex justify-between">
          <p>© 2026 ShopMate Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-slate-400 underline">Privacy Policy</Link>
            <Link href="/dashboard" className="hover:text-slate-400 underline">Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
