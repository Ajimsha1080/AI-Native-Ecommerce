'use client';

import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/layout/Navbar';
import StudioSidebar from '@/components/layout/StudioSidebar';
import { 
  ShoppingBag, RefreshCw, CheckCircle2, Package, Layers, Plus, 
  Eye, ZoomIn, ZoomOut, X, ExternalLink 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function CommercePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const agentId = resolvedParams.id;
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [previewImage, setPreviewImage] = useState<any | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const loadCommerce = () => {
    fetch('/api/commerce/products')
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .catch(() => {});

    fetch('/api/commerce/orders')
      .then(r => r.json())
      .then(d => setOrders(d.orders || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadCommerce();
  }, [agentId]);

  const handleSync = async () => {
    setSyncing(true);
    await fetch('/api/commerce/sync', { method: 'POST' });
    setTimeout(() => {
      setSyncing(false);
      loadCommerce();
    }, 600);
  };

  return (
    <div className="h-screen bg-[#f4f5f7] text-zinc-900 flex flex-col overflow-hidden selection:bg-zinc-200">
      <Navbar />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <StudioSidebar agentId={agentId} />
        <main className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Live Commerce Data</h1>
              <p className="text-xs text-zinc-600 mt-1">Live store catalog, variant inventory counts, image assets, and order tracking records.</p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing Catalog...' : 'Sync Store Catalog'}</span>
            </button>
          </div>

          {/* Products Catalog Grid */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center justify-between">
              <span>Connected Store Products ({products.length})</span>
              <span className="text-[10px] text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">100% In-Stock Sync • High-Res Assets</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((p) => {
                const mainImage = p.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600';
                return (
                  <div key={p.id} className="p-4 rounded-2xl bg-zinc-50/60 border border-zinc-200 hover:border-zinc-300 transition flex gap-4 shadow-2xs group hover:bg-white">
                    <div 
                      onClick={() => { setPreviewImage({ url: mainImage, title: p.title, price: p.price, description: p.description }); setZoomScale(1); }}
                      className="h-24 w-24 rounded-xl bg-white border border-zinc-200 shrink-0 overflow-hidden relative cursor-pointer group/img shadow-2xs"
                      title="Click to view full image"
                    >
                      <img
                        src={mainImage}
                        alt={p.title}
                        className="h-full w-full object-cover group-hover/img:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-xs text-zinc-900 group-hover:text-indigo-600 transition">{p.title}</h4>
                        <span className="font-mono font-bold text-zinc-900 text-xs">{formatCurrency(p.price)}</span>
                      </div>
                      <p className="text-xs text-zinc-600 line-clamp-1 leading-relaxed">{p.description}</p>
                      <div className="pt-2 flex flex-wrap gap-1.5">
                        {p.variants?.map((v: any) => (
                          <span key={v.id} className="px-2 py-0.5 rounded-full bg-white border border-zinc-200 text-[10px] text-zinc-700 font-mono shadow-2xs">
                            {v.title}: <strong className="text-emerald-700 font-bold">{v.inventory_quantity} left</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Live Store Orders for Status & Return Testing</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-600 uppercase text-[10px] font-mono">
                    <th className="pb-3">Order Number</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Total Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Carrier / Tracking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="text-zinc-700 hover:bg-zinc-50/60 transition">
                      <td className="py-3 font-mono font-bold text-zinc-900">{o.order_number}</td>
                      <td className="py-3 text-zinc-700">{o.customer_name}</td>
                      <td className="py-3 font-mono text-zinc-900 font-semibold">{formatCurrency(o.total_amount)}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-mono border border-emerald-200 font-semibold">
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-[11px] text-zinc-600">
                        {o.carrier}: {o.tracking_number || 'Pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setPreviewImage(null); setZoomScale(1); }}
        >
          <div 
            className="bg-white border border-zinc-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-bold text-zinc-900 truncate">{previewImage.title}</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.max(0.6, prev - 0.25))}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 transition cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-zinc-600">{Math.round(zoomScale * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.min(2.5, prev + 0.25))}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 transition cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 transition cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => { setPreviewImage(null); setZoomScale(1); }}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-zinc-100/60 p-6 flex items-center justify-center min-h-[300px]">
              <div 
                className="transition-transform duration-200 origin-center"
                style={{ transform: `scale(${zoomScale})` }}
              >
                <img 
                  src={previewImage.url} 
                  alt={previewImage.title} 
                  className="max-h-[55vh] max-w-full object-contain rounded-xl shadow-lg border border-zinc-200" 
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-zinc-200 bg-white flex items-center justify-between">
              <span className="text-xs text-zinc-600">{previewImage.description}</span>
              <span className="text-xs font-mono font-bold text-emerald-700">{formatCurrency(previewImage.price)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
