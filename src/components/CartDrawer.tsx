import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { SmartImage } from './SmartImage.tsx';

export function CartDrawer() {
  const {
    cart,
    cartOpen,
    setCartOpen,
    updateCartQuantity,
    removeFromCart,
    formatPrice,
    navigate,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null);

  if (!cartOpen) return null;

  const subtotal = cart.reduce((sum, item) => {
    const unit =
      item.selected_variation?.price ??
      item.selected_size?.price_override ??
      item.selected_color?.price_override ??
      (item.product.sale_price > 0 ? item.product.sale_price : item.product.selling_price);
    return sum + unit * item.quantity;
  }, 0);

  const discountAmount = appliedDiscount ? Math.min(subtotal, appliedDiscount.amount) : 0;
  const estimatedTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponInput.trim()) return;
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponInput.trim(), subtotal }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCouponError(data.error || 'Invalid coupon');
      setAppliedDiscount(null);
      return;
    }
    setAppliedDiscount({ code: data.code, amount: data.discount_amount });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[2px]">
      <div className="w-full max-w-md bg-white text-zinc-950 h-full flex flex-col shadow-2xl border-l border-zinc-200">
        <div className="px-6 py-4 bg-zinc-950 text-white flex items-center justify-between border-b border-[#C9A227]/30">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 text-[#E4C76B]" />
            <h2 className="font-display text-xl font-semibold tracking-wide">Shopping Bag</h2>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close Cart"
            className="p-1.5 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {cart.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <ShoppingBag className="w-10 h-10 mx-auto text-zinc-300" />
              <p className="text-sm text-zinc-600">Your SHOPNEXA bag is currently empty.</p>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate({ page: 'shop', filter: 'own' });
                }}
                className="px-5 py-2.5 bg-zinc-950 text-white text-xs font-semibold hover:bg-[#C9A227] hover:text-black transition-colors"
              >
                Browse Direct Products
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const unitPrice =
                item.selected_variation?.price ??
                item.selected_size?.price_override ??
                item.selected_color?.price_override ??
                (item.product.sale_price > 0 ? item.product.sale_price : item.product.selling_price);
              const img =
                item.selected_variation?.image_url ||
                item.selected_color?.images?.[0] ||
                item.product.images[0];

              return (
                <div key={item.id} className="flex gap-4 pb-5 border-b border-zinc-100">
                  <div className="w-20 h-20 bg-zinc-100 shrink-0 overflow-hidden">
                    <SmartImage src={img} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-zinc-950 line-clamp-2">{item.product.name}</h3>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label="Remove item"
                        className="text-zinc-400 hover:text-red-600 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-1 text-xs text-zinc-500 space-x-2">
                      {item.selected_color && <span>Color: {item.selected_color.name}</span>}
                      {item.selected_size && <span>· Size: {item.selected_size.label}</span>}
                      {item.selected_variation && <span>· {item.selected_variation.variant_name}</span>}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center border border-zinc-300">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="p-1.5 hover:bg-zinc-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-xs font-mono tabular-nums font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="p-1.5 hover:bg-zinc-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold font-mono tabular-nums">
                        {formatPrice(unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 bg-zinc-50 border-t border-zinc-200 space-y-4">
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Promo / Coupon code"
                  className="w-full bg-white border border-zinc-300 pl-8 pr-3 py-2 text-xs focus:border-black focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800"
              >
                Apply
              </button>
            </form>
            {couponError && <p className="text-xs text-red-600">{couponError}</p>}
            {appliedDiscount && (
              <p className="text-xs text-emerald-700 font-medium">
                Coupon {appliedDiscount.code} applied (-{formatPrice(appliedDiscount.amount)})
              </p>
            )}

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="font-mono tabular-nums">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-zinc-950 pt-2 border-t border-zinc-200">
                <span>Estimated Total</span>
                <span className="font-mono tabular-nums">{formatPrice(estimatedTotal)}</span>
              </div>
              <p className="text-[11px] text-zinc-500">Shipping calculated by country & district at checkout.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCartOpen(false);
                navigate({ page: 'checkout' });
              }}
              className="w-full py-3 bg-zinc-950 hover:bg-[#C9A227] text-white hover:text-black text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-colors"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
