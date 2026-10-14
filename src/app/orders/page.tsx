'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { 
  ShoppingBag, Search, RefreshCw, X, CheckCircle2, 
  Clock, AlertCircle, Truck, Package, ChevronRight,
  ExternalLink, ArrowUpRight, Copy, Check, Filter
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { fetchWithCache, invalidateClientCache } from '@/lib/client-cache';
import { CommerceOrder } from '@/types';

type FilterTab = 'ALL' | 'PAID' | 'PROCESSING' | 'COMPLETED';

export default function OrdersPage() {
  const [orders, setOrders] = useState<CommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<CommerceOrder | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadOrders = async (forceFresh = false) => {
    if (forceFresh) setRefreshing(true);
    try {
      if (forceFresh) {
        const res = await fetch('/api/commerce/orders', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
          invalidateClientCache('/api/commerce/orders');
        }
      } else {
        const data = await fetchWithCache<{ orders: CommerceOrder[] }>('/api/commerce/orders');
        if (data?.orders) {
          setOrders(data.orders);
        }
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleSeedDemoOrders = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/commerce/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_sample_orders' })
      });
      if (res.ok) {
        showToast('Sample orders generated successfully!');
        await loadOrders(true);
      } else {
        showToast('Failed to generate sample orders.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error seeding orders.');
    } finally {
      setSeeding(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, newFulfillment?: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch('/api/commerce/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          status: newStatus,
          fulfillment_status: newFulfillment
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
          if (selectedOrder?.id === orderId) {
            setSelectedOrder(data.order);
          }
          showToast(`Order updated to ${newStatus}`);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update order status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Filter tab
      const status = (order.status || '').toUpperCase();
      const fulfillment = (order.fulfillment_status || '').toUpperCase();
      
      let matchesFilter = true;
      if (activeFilter === 'PAID') {
        matchesFilter = status === 'PAID';
      } else if (activeFilter === 'PROCESSING') {
        matchesFilter = status === 'PROCESSING' || fulfillment === 'UNFULFILLED' || fulfillment === 'IN_TRANSIT';
      } else if (activeFilter === 'COMPLETED') {
        matchesFilter = status === 'COMPLETED' || fulfillment === 'DELIVERED';
      }

      // Search term
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        order.order_number?.toLowerCase().includes(query) ||
        order.customer_name?.toLowerCase().includes(query) ||
        order.customer_email?.toLowerCase().includes(query) ||
        order.tracking_number?.toLowerCase().includes(query) ||
        order.items?.some(i => i.title.toLowerCase().includes(query));

      return matchesFilter && matchesSearch;
    });
  }, [orders, activeFilter, searchTerm]);

  const getStatusBadge = (status: string) => {
    const s = (status || 'PENDING').toUpperCase();
    if (s === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          PAID
        </span>
      );
    }
    if (s === 'PROCESSING') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          PROCESSING
        </span>
      );
    }
    if (s === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
          <CheckCircle2 className="w-3 h-3 text-zinc-600" />
          COMPLETED
        </span>
      );
    }
    if (s === 'CANCELLED' || s === 'REFUNDED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-500" />
          {s}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-500" />
        {s}
      </span>
    );
  };

  const getFulfillmentBadge = (fulfillment?: string) => {
    const f = (fulfillment || 'UNFULFILLED').toUpperCase();
    if (f === 'DELIVERED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          DELIVERED
        </span>
      );
    }
    if (f === 'IN_TRANSIT' || f === 'SHIPPED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Truck className="w-3 h-3 text-indigo-500" />
          IN TRANSIT
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
        UNFULFILLED
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-[#f4f5f7] text-zinc-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f4f5f7]">
        <Navbar />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header: Title, Subtitle, and Refresh Orders Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                    Orders Management
                  </h1>
                  {/* Image 1 capsule pill badge */}
                  <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-black bg-white text-blue-600 font-semibold text-xs shadow-2xs select-none">
                    <ShoppingBag className="w-3.5 h-3.5 text-zinc-900" />
                    <span>Orders</span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                  Monitor store conversions, customer inquiries, and fulfillment operations.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadOrders(true)}
                  disabled={loading || refreshing}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 text-xs font-medium rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-60"
                  title="Refresh Orders"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-zinc-600 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh Orders</span>
                </button>
              </div>
            </div>

            {/* Search Bar & Filter Pills matching Image 2 */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search input with magnifying glass */}
              <div className="relative flex-1 max-w-xl">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by order #, customer name or email..."
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent shadow-2xs"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs (ALL, PAID, PROCESSING, COMPLETED) */}
              <div className="inline-flex items-center gap-1 bg-white border border-zinc-200 rounded-xl p-1 shadow-2xs self-start sm:self-auto">
                {(['ALL', 'PAID', 'PROCESSING', 'COMPLETED'] as const).map((tab) => {
                  const active = activeFilter === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveFilter(tab)}
                      className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        active
                          ? 'bg-zinc-900 text-white shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Orders Table Card */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="border-b border-zinc-200 bg-zinc-50/75">
                    <tr>
                      <th className="pl-6 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                        ORDER #
                      </th>
                      <th className="px-4 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                        CUSTOMER
                      </th>
                      <th className="px-4 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                        TOTAL
                      </th>
                      <th className="px-4 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                        STATUS
                      </th>
                      <th className="px-4 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                        FULFILLMENT
                      </th>
                      <th className="px-4 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                        DATE
                      </th>
                      <th className="pr-6 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-right">
                        ACTION
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-100">
                    {loading && orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-20 text-center">
                          <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
                            <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
                            <span>Loading live store orders...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredOrders.length === 0 ? (
                      /* Empty State matching Image 2 exactly */
                      <tr>
                        <td colSpan={7}>
                          <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                            {/* Isometric wireframe box SVG identical to image 2 */}
                            <svg 
                              className="w-10 h-10 text-zinc-300 stroke-[1.2]" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            >
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                              <line x1="12" y1="22.08" x2="12" y2="12" />
                            </svg>
                            <p className="text-xs text-zinc-400 mt-3 font-normal">
                              No orders found matching criteria.
                            </p>
                            {orders.length === 0 && (
                              <button
                                onClick={handleSeedDemoOrders}
                                disabled={seeding}
                                className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition shadow-2xs cursor-pointer disabled:opacity-60"
                              >
                                {seeding ? 'Generating Samples...' : 'Create Sample Orders'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr 
                          key={order.id}
                          className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <td className="pl-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">
                              {order.order_number || order.id}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-zinc-900">
                                {order.customer_name || 'Store Customer'}
                              </span>
                              <span className="text-[11px] text-zinc-400 font-mono">
                                {order.customer_email}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-xs font-mono font-semibold text-zinc-900">
                              {order.currency === 'INR' || !order.currency ? '₹' : '$'}
                              {Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {getFulfillmentBadge(order.fulfillment_status)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-xs text-zinc-500 font-mono">
                            {new Date(order.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="pr-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg border border-zinc-200 transition shadow-2xs"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Summary Count */}
              {filteredOrders.length > 0 && (
                <div className="border-t border-zinc-100 px-6 py-3 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    Showing <strong className="text-zinc-800">{filteredOrders.length}</strong> of{' '}
                    <strong className="text-zinc-800">{orders.length}</strong> total orders
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSeedDemoOrders}
                      disabled={seeding}
                      className="text-xs text-zinc-600 hover:text-zinc-900 underline font-medium cursor-pointer disabled:opacity-50"
                    >
                      {seeding ? 'Generating...' : '+ Add Sample Orders'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Order Details Slide-over / Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-fade-in">
            <div 
              className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-slide-in-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                {/* Modal Header */}
                <div className="p-6 border-b border-zinc-200 flex items-center justify-between sticky top-0 bg-white z-10">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-zinc-900 font-mono">
                        {selectedOrder.order_number || selectedOrder.id}
                      </h2>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Placed on {new Date(selectedOrder.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 text-xs">
                  {/* Status Modification Controls */}
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                      Manage Fulfillment &amp; Payment Status
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-zinc-500 block mb-1">Financial Status</label>
                        <select
                          value={selectedOrder.status || 'PAID'}
                          disabled={isUpdatingStatus}
                          onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value, selectedOrder.fulfillment_status)}
                          className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        >
                          <option value="PAID">PAID</option>
                          <option value="PROCESSING">PROCESSING</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="PENDING">PENDING</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500 block mb-1">Fulfillment Status</label>
                        <select
                          value={selectedOrder.fulfillment_status || 'UNFULFILLED'}
                          disabled={isUpdatingStatus}
                          onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, selectedOrder.status, e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        >
                          <option value="UNFULFILLED">UNFULFILLED</option>
                          <option value="IN_TRANSIT">IN TRANSIT</option>
                          <option value="DELIVERED">DELIVERED</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-zinc-900 text-xs uppercase tracking-wider">
                      Customer Details
                    </h3>
                    <div className="bg-white border border-zinc-200 rounded-xl p-3.5 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Name</span>
                        <span className="font-medium text-zinc-800">{selectedOrder.customer_name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Email</span>
                        <span className="font-mono text-zinc-800">{selectedOrder.customer_email}</span>
                      </div>
                      {selectedOrder.customer_phone && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Phone</span>
                          <span className="font-mono text-zinc-800">{selectedOrder.customer_phone}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Shipping Address</span>
                        <span className="text-right text-zinc-800 max-w-[240px]">
                          {typeof selectedOrder.shipping_address === 'string' 
                            ? selectedOrder.shipping_address 
                            : JSON.stringify(selectedOrder.shipping_address) || 'Standard delivery'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Shipping & Logistics */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-zinc-900 text-xs uppercase tracking-wider">
                      Logistics &amp; Tracking
                    </h3>
                    <div className="bg-white border border-zinc-200 rounded-xl p-3.5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Carrier</span>
                        <span className="font-medium text-zinc-800">{selectedOrder.carrier || 'Standard Courier'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Tracking Number</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-zinc-800">
                            {selectedOrder.tracking_number || 'TRK-PENDING'}
                          </span>
                          {selectedOrder.tracking_number && (
                            <button
                              onClick={() => copyToClipboard(selectedOrder.tracking_number!, 'tracking')}
                              className="p-1 hover:bg-zinc-100 rounded text-zinc-500"
                              title="Copy Tracking #"
                            >
                              {copiedId === 'tracking' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Line Items */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-zinc-900 text-xs uppercase tracking-wider">
                      Items Ordered ({selectedOrder.items?.length || 0})
                    </h3>
                    <div className="border border-zinc-200 rounded-xl divide-y divide-zinc-100 overflow-hidden">
                      {(selectedOrder.items || []).map((item, idx) => (
                        <div key={idx} className="p-3.5 flex items-center justify-between gap-3 bg-white">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium text-zinc-900">{item.title}</p>
                              <p className="text-[11px] text-zinc-400">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <span className="font-mono font-semibold text-zinc-900">
                            {selectedOrder.currency === 'INR' || !selectedOrder.currency ? '₹' : '$'}
                            {Number(item.price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Financial Summary */}
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-zinc-500">
                      <span>Subtotal</span>
                      <span className="font-mono">
                        {selectedOrder.currency === 'INR' || !selectedOrder.currency ? '₹' : '$'}
                        {Number(selectedOrder.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Shipping &amp; Taxes</span>
                      <span className="text-emerald-600 font-medium">Free Included</span>
                    </div>
                    <div className="border-t border-zinc-200 pt-2 flex justify-between font-bold text-zinc-900 text-sm">
                      <span>Grand Total</span>
                      <span className="font-mono text-emerald-600">
                        {selectedOrder.currency === 'INR' || !selectedOrder.currency ? '₹' : '$'}
                        {Number(selectedOrder.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-zinc-200 bg-white flex items-center justify-between">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
                <div className="flex items-center gap-2">
                  {selectedOrder.fulfillment_status !== 'DELIVERED' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'COMPLETED', 'DELIVERED')}
                      disabled={isUpdatingStatus}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Delivered</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-zinc-950 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-bounce-subtle border border-zinc-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
}
