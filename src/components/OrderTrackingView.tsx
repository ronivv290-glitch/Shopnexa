import React, { useState, useEffect } from 'react';
import { Search, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

export function OrderTrackingView({ initialOrderNumber = '' }: { initialOrderNumber?: string }) {
  const { formatPrice, markBuyerVerified } = useStore();
  const [query, setQuery] = useState(initialOrderNumber);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const lookupOrder = async (num: string) => {
    if (!num.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(num.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setResult(null);
        setError(data.error || 'Order not found');
        return;
      }
      setResult(data);
      markBuyerVerified();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderNumber) {
      setQuery(initialOrderNumber);
      void lookupOrder(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  const STATUS_STEPS = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered'];

  return (
    <div className="max-w-3xl mx-auto px-4 py-14 space-y-8">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#9C7A16]">LOGISTICS & FULFILLMENT</p>
        <h1 className="font-display text-4xl font-semibold text-zinc-950">Track Your SHOPNEXA Order</h1>
        <p className="text-xs text-zinc-600">Enter your unique Order ID (e.g., SNX-...) to view live fulfillment and courier status.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void lookupOrder(query);
        }}
        className="flex border border-zinc-950 bg-white"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter Order ID (SNX-...)"
          className="flex-1 px-4 py-3 text-sm font-mono focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-zinc-950 hover:bg-[#C9A227] text-white hover:text-black text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? 'Searching...' : 'Track Order'}</span>
        </button>
      </form>

      {error && <div className="border border-red-300 bg-red-50 text-red-700 p-4 text-xs">{error}</div>}

      {result && (
        <div className="border border-zinc-200 p-6 space-y-6 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
            <div>
              <p className="text-xs text-zinc-500">Order ID</p>
              <p className="font-mono text-lg font-semibold text-zinc-950">{result.order_number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Current Status</p>
              <p className="text-sm font-semibold text-[#9C7A16]">{result.order_status}</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 text-[11px]">
            {STATUS_STEPS.map((st, idx) => {
              const currentIdx = STATUS_STEPS.indexOf(result.order_status);
              const active = currentIdx >= idx;
              return (
                <div
                  key={st}
                  className={`p-2 border text-center font-medium ${
                    active ? 'border-zinc-950 bg-zinc-950 text-[#E4C76B]' : 'border-zinc-200 text-zinc-400'
                  }`}
                >
                  {st}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-zinc-50 p-4 border border-zinc-200">
            <div>
              <p className="text-zinc-500">Courier Service</p>
              <p className="font-semibold text-zinc-950 flex items-center gap-1 mt-0.5">
                <Truck className="w-3.5 h-3.5 text-[#9C7A16]" />
                <span>{result.courier_name || 'Awaiting Dispatch'}</span>
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Tracking Number</p>
              <p className="font-mono font-semibold text-zinc-950 mt-0.5">
                {result.tracking_number || 'Not assigned yet'}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Payment</p>
              <p className="font-semibold text-zinc-950 uppercase mt-0.5">
                {result.payment_method} ({result.payment_status})
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p className="font-semibold text-zinc-950">Order Items</p>
            {result.items?.map((it: any) => (
              <div key={it.id} className="flex justify-between py-2 border-b border-zinc-100">
                <span>
                  {it.quantity} × {it.product_name}
                </span>
                <span className="font-mono tabular-nums">{formatPrice(it.line_total)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold text-sm pt-2">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatPrice(result.final_total)}</span>
            </div>
          </div>

          <div className="bg-zinc-950 text-white border border-[#C9A227]/40 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs">
              <p className="font-semibold text-[#E4C76B] tracking-wider">BUYER APP DOWNLOAD</p>
              <p className="text-zinc-300 mt-0.5">Install the SHOPNEXA Buyer App for products and live tracking.</p>
            </div>
            <PWAInstallButton variant="banner" label="Download App" />
          </div>
        </div>
      )}
    </div>
  );
}
