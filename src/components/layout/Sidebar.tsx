'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutGrid, Bot, Package, BookOpen, Layers, 
  Wrench, MessageSquare, Search, BarChart3, 
  Globe, ShieldCheck, Users, CreditCard
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  // Exact 13-item SaaS navigation as specified
  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: LayoutGrid,
      isActive: (path: string) => path === '/dashboard' || path === '/'
    },
    { 
      name: 'AI Agent', 
      href: '/agents/agent_shopmate_01', 
      icon: Bot,
      isActive: (path: string) => path.startsWith('/agents') && !path.includes('/playground')
    },
    { 
      name: 'Products', 
      href: '/products', 
      icon: Package,
      isActive: (path: string) => path.startsWith('/products') || path.includes('/commerce')
    },
    { 
      name: 'Knowledge', 
      href: '/knowledge', 
      icon: BookOpen,
      isActive: (path: string) => path.startsWith('/knowledge')
    },
    { 
      name: 'Integrations', 
      href: '/integrations', 
      icon: Layers,
      isActive: (path: string) => path.startsWith('/integrations')
    },
    { 
      name: 'Actions', 
      href: '/actions', 
      icon: Wrench,
      isActive: (path: string) => path.startsWith('/actions') || path.includes('/tools')
    },
    { 
      name: 'Conversations', 
      href: '/conversations', 
      icon: MessageSquare,
      isActive: (path: string) => path.startsWith('/conversations')
    },
    { 
      name: 'AI Search', 
      href: '/search', 
      icon: Search,
      isActive: (path: string) => path.startsWith('/search') || path.includes('/playground')
    },
    { 
      name: 'Analytics', 
      href: '/analytics', 
      icon: BarChart3,
      isActive: (path: string) => path.startsWith('/analytics')
    },
    { 
      name: 'Widget & Deploy', 
      href: '/deployments', 
      icon: Globe,
      isActive: (path: string) => path.startsWith('/deployments') || path.includes('/deploy')
    },
    { 
      name: 'Security', 
      href: '/security', 
      icon: ShieldCheck,
      isActive: (path: string) => path.startsWith('/security') || path.startsWith('/api-keys') || path.includes('/security')
    },
    { 
      name: 'Team', 
      href: '/team', 
      icon: Users,
      isActive: (path: string) => path.startsWith('/team') || path.includes('/members')
    },
    { 
      name: 'Billing', 
      href: '/billing', 
      icon: CreditCard,
      isActive: (path: string) => path.startsWith('/billing')
    },
  ];

  return (
    <aside className="w-60 border-r border-zinc-800/80 bg-[#08090d] flex flex-col justify-between shrink-0 select-none overflow-y-auto">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-zinc-800/70 flex items-center justify-between sticky top-0 bg-[#08090d] z-10">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Bot className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white tracking-tight">
                ShopMate
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-400">
                SaaS
              </span>
            </div>
          </Link>
        </div>

        {/* 13 Main Navigation Links */}
        <nav className="p-2.5 space-y-1 pt-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                  active
                    ? 'bg-zinc-850 text-white border border-indigo-500/30 shadow shadow-indigo-950/40 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 border border-transparent'
                }`}
              >
                <Icon 
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    active ? 'text-indigo-400' : 'text-zinc-400'
                  }`} 
                />
                <span className="tracking-tight truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tenant Workspace Isolation Footer */}
      <div className="p-3 border-t border-zinc-800/60 sticky bottom-0 bg-[#08090d]">
        <div className="px-3 py-2 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-zinc-300 font-sans font-medium">Tenant Isolated</span>
          </div>
          <span className="text-[10px] text-zinc-500">v2.5 Live</span>
        </div>
      </div>
    </aside>
  );
}