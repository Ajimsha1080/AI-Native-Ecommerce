'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bot, Shield, LogOut, ChevronDown, User, Plus, 
  Building, Search 
} from 'lucide-react';
import CommandMenu from '@/components/ui/CommandMenu';
import PortalSwitcher from '@/components/layout/PortalSwitcher';
import { fetchWithCache, getClientCachedData } from '@/lib/client-cache';

export default function Navbar() {
  const router = useRouter();
  const cachedUser = getClientCachedData<{ user: any }>('/api/auth/me');
  const [user, setUser] = useState<any>(() => cachedUser?.user || null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await fetchWithCache<{ user: any }>('/api/auth/me');
        if (data?.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadUser();

    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    }
    window.addEventListener('keydown', handleKey);

    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
      <header className="h-14 border-b border-zinc-800 bg-[#09090b] px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none">
        {/* Workspace Indicator & Command Bar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <Building className="w-3.5 h-3.5 text-zinc-400" />
            <span className="truncate max-w-[140px] font-semibold text-white">{user?.workspaceName || 'Acme Commerce'}</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              {user?.role || 'OWNER'}
            </span>
          </div>

          {/* Quick Search Trigger */}
          <button
            onClick={() => setCommandOpen(true)}
            className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition"
          >
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <span>Search agents, catalog, traces...</span>
            <kbd className="px-1.5 py-0.2 text-[10px] font-mono bg-zinc-800 rounded border border-zinc-700 text-zinc-300">⌘K</kbd>
          </button>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2.5">
          <PortalSwitcher />

          <Link
            href="/agents/agent_shopmate_01/playground"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition"
          >
            <Bot className="w-3.5 h-3.5" /> Assistant Studio
          </Link>

          {/* User dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 p-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition"
            >
              <div className="w-6 h-6 rounded bg-zinc-800 text-zinc-200 font-bold text-xs flex items-center justify-center border border-zinc-700 font-mono">
                {user?.name ? user.name[0].toUpperCase() : 'M'}
              </div>
              <span className="text-xs font-medium hidden md:inline truncate max-w-[100px]">{user?.name || 'Merchant'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 z-50 text-xs divide-y divide-zinc-800">
                <div className="px-3 py-2">
                  <p className="font-semibold text-white truncate">{user?.name || 'Demo Merchant'}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{user?.email || 'merchant@shopmate.com'}</p>
                </div>

                <div className="py-1">
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                  >
                    <User className="w-3.5 h-3.5 text-zinc-400" /> Settings
                  </Link>
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                  >
                    <Shield className="w-3.5 h-3.5 text-zinc-400" /> SuperAdmin
                  </Link>
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:bg-rose-950/30 transition text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      <CommandMenu isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
    </>
  );
}