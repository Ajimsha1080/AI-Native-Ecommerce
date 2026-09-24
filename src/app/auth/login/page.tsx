'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showDemoCredentials = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDS === 'true' || process.env.NODE_ENV !== 'production';

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Invalid credentials');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  const selectDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-black">
            <Bot className="w-5 h-5 text-zinc-950" />
          </div>
          <span className="text-lg font-bold text-zinc-100 tracking-tight">ShopMate AaaS</span>
        </Link>
        <h2 className="text-lg font-semibold text-zinc-100 pt-2">Sign in to your store workspace</h2>
        <p className="text-xs text-zinc-400">Manage autonomous AI e-commerce agents and live catalogs</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#121215] border border-zinc-800 py-8 px-6 shadow-2xl rounded-xl sm:px-10 space-y-6">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="merchant@yourstore.com"
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-zinc-300">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-zinc-400 hover:text-zinc-200">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Dev-Only Demo Logins */}
          {showDemoCredentials && (
            <div className="pt-4 border-t border-zinc-800 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Development Quick Fill:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => selectDemoAccount('merchant@shopmate.com', 'password123')}
                  className="p-2.5 rounded-lg bg-[#09090b] border border-zinc-800 hover:border-zinc-600 text-left transition text-[11px]"
                >
                  <p className="font-semibold text-zinc-200">Merchant</p>
                  <p className="text-zinc-500 text-[10px] font-mono">merchant@shopmate.com</p>
                </button>
                <button
                  type="button"
                  onClick={() => selectDemoAccount('admin@aaas-platform.com', 'admin123')}
                  className="p-2.5 rounded-lg bg-[#09090b] border border-zinc-800 hover:border-zinc-600 text-left transition text-[11px]"
                >
                  <p className="font-semibold text-zinc-200">SuperAdmin</p>
                  <p className="text-zinc-500 text-[10px] font-mono">admin@aaas-platform.com</p>
                </button>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-zinc-400">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-zinc-200 font-semibold hover:underline">
              Create a workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
