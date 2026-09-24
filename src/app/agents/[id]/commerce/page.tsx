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
    <div className="h-screen bg-[#09090b] text-zinc-100 flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <StudioSidebar agentId={agentId} />
        <main className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Live Commerce Data</h1>
              <p className="text-xs text-zinc-400 mt-1">Live store catalog, variant inventory counts, image assets, and order tracking records.</p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-lg transition flex items-center gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing Catalog...' : 'Sync Store Catalog'}</span>
            </button>
          </div>

          {/* Products Catalog Table */}
          <div className="p-6 rounded-xl bg-[#121215] border border-zinc-800 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-200 flex items-center justify-between">
              <span>Connected Store Products ({products.length})</span>
              <span className="text-[10px] text-emerald-400 font-mono">100% In-Stock Sync • High-Res Assets</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((p) => {
                const mainImage = p.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600';
                return (
                  <div key={p.id} className="p-4 rounded-xl bg-[#09090b] border border-zinc-800 hover:border-zinc-700 transition flex gap-4 shadow-sm group">
                    <div 
                      onClick={() => { setPreviewImage({ url: mainImage, title: p.title, price: p.price, description: p.description }); setZoomScale(1); }}
                      className="h-24 w-24 rounded-lg bg-zinc-950 border border-zinc-800 shrink-0 overflow-hidden relative cursor-pointer group/img"
                      title="Click to view full image"
                    >
                      <img
                        src={mainImage}
                        alt={p.title}
                        className="h-full w-full object-cover group-hover/img:scale-110 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-xs text-zinc-200 group-hover:text-emerald-400 transition">{p.title}</h4>
                        <span className="font-mono font-semibold text-zinc-100 text-xs">{formatCurrency(p.price)}</span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-1">{p.description}</p>
                      <div className="pt-2 flex flex-wrap gap-1.5">
                        {p.variants?.map((v: any) => (
                          <span key={v.id} className="px-2 py-0.5 rounded bg-zinc-850 border border-zinc-700 text-[10px] text-zinc-300 font-mono">
                            {v.title}: <strong className="text-emerald-400">{v.inventory_quantity} left</strong>
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
          <div className="p-6 rounded-xl bg-[#121215] border border-zinc-800 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-200">Live Store Orders for Status & Return Testing</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] font-mono">
                    <th className="pb-3">Order Number</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Total Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Carrier / Tracking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {orders.map((o) => (
                    <tr key={o.id} className="text-zinc-300">
                      <td className="py-3 font-mono font-semibold text-zinc-100">{o.order_number}</td>
                      <td className="py-3 text-zinc-300">{o.customer_name}</td>
                      <td className="py-3 font-mono text-zinc-200">{formatCurrency(o.total_amount)}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 text-[10px] font-mono border border-emerald-800/50">
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-[11px] text-zinc-400">
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
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => { setPreviewImage(null); setZoomScale(1); }}
        >
          <div 
            className="bg-[#121215] border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <h3 className="text-sm font-bold text-white truncate">{previewImage.title}</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.max(0.6, prev - 0.25))}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-zinc-400">{Math.round(zoomScale * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.min(2.5, prev + 0.25))}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => { setPreviewImage(null); setZoomScale(1); }}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-zinc-950/80 p-6 flex items-center justify-center min-h-[300px]">
              <div 
                className="transition-transform duration-200 origin-center"
                style={{ transform: `scale(${zoomScale})` }}
              >
                <img 
                  src={previewImage.url} 
                  alt={previewImage.title} 
                  className="max-h-[55vh] max-w-full object-contain rounded-lg shadow-2xl border border-zinc-800" 
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <span className="text-xs text-zinc-400">{previewImage.description}</span>
              <span className="text-xs font-mono font-bold text-emerald-400">{formatCurrency(previewImage.price)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
