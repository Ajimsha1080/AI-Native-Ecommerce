'use client';

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { 
  Users, UserPlus, Shield, CheckCircle2, 
  Mail, MoreVertical, X, Check, ShieldCheck 
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  twoFactorEnabled: boolean;
  joinedAt: string;
  avatar: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: 'usr_1',
      name: 'Alex Rivera',
      email: 'alex@acmestore.com',
      role: 'ADMIN',
      twoFactorEnabled: true,
      joinedAt: 'Aug 12, 2025',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
    },
    {
      id: 'usr_2',
      name: 'Marcus Chen',
      email: 'marcus@acmestore.com',
      role: 'EDITOR',
      twoFactorEnabled: true,
      joinedAt: 'Sep 04, 2025',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'
    },
    {
      id: 'usr_3',
      name: 'Sarah Jenkins',
      email: 'sarah.j@acmestore.com',
      role: 'VIEWER',
      twoFactorEnabled: false,
      joinedAt: 'Jan 15, 2026',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'
    }
  ]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('EDITOR');
  const [inviteName, setInviteName] = useState('');

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newMember: TeamMember = {
      id: 'usr_' + Math.random().toString(36).substring(2, 7),
      name: inviteName || inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      twoFactorEnabled: false,
      joinedAt: 'Just now',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
    };

    setMembers(prev => [...prev, newMember]);
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteName('');
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans antialiased selection:bg-zinc-700 selection:text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-base font-bold text-white tracking-tight">Team Members &amp; Roles</h1>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {members.length} Active Seats
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Manage tenant workspace access, role permissions (Admin, Editor, Viewer), and 2FA enforcement.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-1.5 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Invite Member
                </button>
              </div>
            </div>

            {/* Team Members List */}
            <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] font-mono">
                      <th className="pb-3">Member</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3">2FA Status</th>
                      <th className="pb-3">Joined Date</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {members.map((m) => (
                      <tr key={m.id} className="hover:bg-zinc-900/40 transition">
                        <td className="py-3.5 flex items-center gap-3">
                          <img src={m.avatar} alt={m.name} className="w-8 h-8 rounded-full object-cover border border-zinc-700" />
                          <div>
                            <p className="font-semibold text-white text-xs">{m.name}</p>
                            <p className="text-[11px] text-zinc-400 font-mono">{m.email}</p>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                            m.role === 'ADMIN'
                              ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/40 font-semibold'
                              : m.role === 'EDITOR'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}>
                            {m.role}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-1.5 text-xs">
                            {m.twoFactorEnabled ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
                              </span>
                            ) : (
                              <span className="text-zinc-500 font-mono text-[11px]">Pending Setup</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 text-zinc-400 font-mono text-[11px]">
                          {m.joinedAt}
                        </td>
                        <td className="py-3.5 text-right">
                          <select
                            value={m.role}
                            onChange={(e) => {
                              const newRole = e.target.value as any;
                              setMembers(prev => prev.map(item => item.id === m.id ? { ...item, role: newRole } : item));
                            }}
                            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] rounded px-2 py-1 focus:outline-none focus:border-zinc-600"
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="EDITOR">Editor</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white">Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jordan Miller"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="jordan@acmestore.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Role Permission</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                >
                  <option value="ADMIN">Admin (Full Access & Billing)</option>
                  <option value="EDITOR">Editor (Manage Knowledge & Agent)</option>
                  <option value="VIEWER">Viewer (Read-only Analytics)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white text-zinc-950 hover:bg-zinc-200 shadow"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
