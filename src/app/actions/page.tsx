'use client';

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { 
  Wrench, ShieldAlert, ShieldCheck, CheckCircle2, AlertTriangle, 
  Lock, Save, RefreshCw, ShoppingCart, Truck, RotateCcw, 
  CreditCard, Tag, Search, Check, AlertCircle, ArrowRight
} from 'lucide-react';

interface ToolAction {
  id: string;
  name: string;
  description: string;
  category: 'READ' | 'WRITE' | 'HIGH_RISK';
  enabled: boolean;
  requiresApproval: boolean;
  endpoint: string;
  avgLatency: string;
}

export default function ActionsPermissionsPage() {
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  
  const [actions, setActions] = useState<ToolAction[]>([
    {
      id: 'inventory_lookup',
      name: 'Check Inventory',
      description: 'Query real-time variant stock counts across store warehouses.',
      category: 'READ',
      enabled: true,
      requiresApproval: false,
      endpoint: 'GET /api/commerce/inventory',
      avgLatency: '18ms'
    },
    {
      id: 'order_lookup',
      name: 'Track Order Status',
      description: 'Lookup live carrier tracking number, delivery eta, and line items.',
      category: 'READ',
      enabled: true,
      requiresApproval: false,
      endpoint: 'GET /api/commerce/orders/:id',
      avgLatency: '24ms'
    },
    {
      id: 'cart_add',
      name: 'Add Item to Cart',
      description: 'Append products to customer session cart and recalculate subtotal.',
      category: 'WRITE',
      enabled: true,
      requiresApproval: false,
      endpoint: 'POST /api/commerce/cart/items',
      avgLatency: '32ms'
    },
    {
      id: 'return_request',
      name: 'Create Return Request',
      description: 'Generate customer RMA ticket and return procedure steps.',
      category: 'WRITE',
      enabled: true,
      requiresApproval: false,
      endpoint: 'POST /api/commerce/returns',
      avgLatency: '45ms'
    },
    {
      id: 'check_discount',
      name: 'Check Active Discounts',
      description: 'Verify coupon validity, minimum spend criteria, and expiration.',
      category: 'READ',
      enabled: true,
      requiresApproval: false,
      endpoint: 'GET /api/commerce/discounts',
      avgLatency: '15ms'
    },
    {
      id: 'apply_coupon',
      name: 'Apply Coupon to Cart',
      description: 'Apply percentage or fixed discount code to cart checkout total.',
      category: 'WRITE',
      enabled: true,
      requiresApproval: false,
      endpoint: 'POST /api/commerce/cart/apply-code',
      avgLatency: '28ms'
    },
    {
      id: 'cancel_order',
      name: 'Cancel Store Order',
      description: 'Cancel customer order before warehouse fulfillment dispatch.',
      category: 'HIGH_RISK',
      enabled: true,
      requiresApproval: true,
      endpoint: 'POST /api/commerce/orders/:id/cancel',
      avgLatency: '65ms'
    },
    {
      id: 'place_order',
      name: 'Place Order / Direct Checkout',
      description: 'Finalize order placement using customer authorized billing token.',
      category: 'HIGH_RISK',
      enabled: true,
      requiresApproval: true,
      endpoint: 'POST /api/commerce/checkout/commit',
      avgLatency: '120ms'
    },
    {
      id: 'refund_customer',
      name: 'Issue Customer Refund',
      description: 'Trigger refund disbursement via payment gateway (Stripe/Shopify Pay).',
      category: 'HIGH_RISK',
      enabled: true,
      requiresApproval: true,
      endpoint: 'POST /api/commerce/refunds',
      avgLatency: '140ms'
    },
  ]);

  const toggleActionEnabled = (id: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const toggleApprovalRequired = (id: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, requiresApproval: !a.requiresApproval } : a));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 600);
  };

  const standardActions = actions.filter(a => a.category !== 'HIGH_RISK');
  const highRiskActions = actions.filter(a => a.category === 'HIGH_RISK');

  return (
    <div className="flex h-screen bg-[#f4f5f7] text-zinc-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f4f5f7]">
        <Navbar />

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-base font-bold text-zinc-900 tracking-tight">AI Agent Action Permissions</h1>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                      RBAC &amp; APPROVAL ENGINE
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Authorize backend commerce tools. High-risk operations require customer or admin confirmation before execution.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-[#18181b] hover:bg-[#27272a] text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : savedSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Permissions Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Save Permissions
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Security Notice Banner */}
            <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-700 space-y-1">
                <p className="font-bold text-zinc-900">Backend Authorization Security Guarantee</p>
                <p className="text-zinc-500 leading-relaxed">
                  The LLM cannot directly modify database records. Every action executes through strictly authenticated backend APIs with parameter validation, rate limits, and tenant workspace isolation.
                </p>
              </div>
            </div>

            {/* Section 1: Standard / Operational Tools */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Standard Commerce Tools (Read &amp; Cart Operations)
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Autonomous execution allowed when user intent matches.</p>
                </div>
                <span className="text-xs font-mono text-zinc-500 font-semibold">{standardActions.filter(a => a.enabled).length} Active</span>
              </div>

              <div className="divide-y divide-zinc-100">
                {standardActions.map((action) => (
                  <div key={action.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-zinc-900">{action.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 border border-zinc-200 text-zinc-600">
                          {action.endpoint}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {action.avgLatency}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">{action.description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleActionEnabled(action.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                          action.enabled
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                        }`}
                      >
                        {action.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Higher-Risk Actions */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    High-Risk &amp; Financial Actions (Confirmation &amp; Approvals)
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Actions that impact payments, order commitments, or cancellations.</p>
                </div>
                <span className="text-xs font-mono text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Confirmation Enforced</span>
              </div>

              <div className="divide-y divide-zinc-100">
                {highRiskActions.map((action) => (
                  <div key={action.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-zinc-900">{action.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
                          HIGH RISK
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 border border-zinc-200 text-zinc-600">
                          {action.endpoint}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">{action.description}</p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        onClick={() => toggleApprovalRequired(action.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition flex items-center gap-1.5 ${
                          action.requiresApproval
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {action.requiresApproval ? 'User Confirmation Required' : 'Auto-Execution'}
                      </button>

                      <button
                        onClick={() => toggleActionEnabled(action.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                          action.enabled
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                        }`}
                      >
                        {action.enabled ? 'Authorized' : 'Blocked'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
