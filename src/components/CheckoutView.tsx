import React, { useState, useEffect } from 'react';
import { ShieldCheck, Printer, CheckCircle2, Tag, MapPin, Lock, Copy, Check } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import type { CustomerAddress, PaymentMethod } from '../types.ts';
import { SmartImage } from './SmartImage.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

const BD_DIVISIONS = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'];
const COUNTRIES = [
  'Bangladesh',
  'United States',
  'United Kingdom',
  'United Arab Emirates',
  'Canada',
  'Singapore',
  'Australia',
  'Germany',
  'France',
  'India',
  'Saudi Arabia',
  'Malaysia',
];

const EMPTY_ADDRESS: CustomerAddress = {
  label: 'Home',
  is_default: true,
  full_name: '',
  mobile: '',
  alt_phone: '',
  email: '',
  country: 'Bangladesh',
  division: 'Rangpur',
  district: 'Rangpur',
  upazila: '',
  thana: '',
  union_name: '',
  municipality: '',
  city: '',
  village: '',
  area: '',
  road_number: '',
  house_number: '',
  apartment_number: '',
  floor_number: '',
  state_province: '',
  street_address: '',
  postal_code: '',
  landmark: '',
  instructions: '',
};

export function CheckoutView() {
  const {
    cart,
    user,
    authToken,
    paymentSettings,
    formatPrice,
    clearCart,
    refreshStore,
    navigate,
    lastCompletedOrder,
    setLastCompletedOrder,
    showToast,
  } = useStore();

  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [address, setAddress] = useState<CustomerAddress>({
    ...EMPTY_ADDRESS,
    full_name: user?.name || '',
    mobile: user?.phone || '',
    email: user?.email || '',
  });
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [transactionId, setTransactionId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [shippingQuote, setShippingQuote] = useState<{
    shipping_charge: number;
    estimated_days: string;
    zone_name: string;
  }>({ shipping_charge: 0, estimated_days: '2–5 Business Days', zone_name: 'Standard' });
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);

  useEffect(() => {
    if (authToken) {
      fetch('/api/addresses', { headers: { Authorization: `Bearer ${authToken}` } })
        .then((r) => (r.ok ? r.json() : []))
        .then((list: CustomerAddress[]) => {
          setSavedAddresses(list);
          const def = list.find((a) => a.is_default) || list[0];
          if (def) setAddress(def);
        })
        .catch(() => {});
    }
  }, [authToken]);

  const subtotal = cart.reduce((sum, item) => {
    const unit =
      item.selected_variation?.price ??
      item.selected_size?.price_override ??
      item.selected_color?.price_override ??
      (item.product.sale_price > 0 ? item.product.sale_price : item.product.selling_price);
    return sum + unit * item.quantity;
  }, 0);

  useEffect(() => {
    fetch('/api/shipping/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        country: address.country,
        district: address.district,
        subtotal,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setShippingQuote(data);
      })
      .catch(() => {});
  }, [address.country, address.district, subtotal]);

  const isBangladesh = address.country.toLowerCase() === 'bangladesh';

  const availableGateways = paymentSettings.filter((g) => {
    if (!g.is_enabled) return false;
    if (isBangladesh) return ['bkash', 'nagad', 'cod'].includes(g.gateway);
    return g.gateway === 'international_card';
  });

  useEffect(() => {
    if (availableGateways.length > 0 && !availableGateways.some((g) => g.gateway === paymentMethod)) {
      setPaymentMethod(availableGateways[0].gateway);
    }
  }, [isBangladesh, availableGateways, paymentMethod]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponCode.trim(), subtotal }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Invalid coupon', 'error');
      setAppliedDiscount(null);
      return;
    }
    setAppliedDiscount({ code: data.code, amount: data.discount_amount });
    showToast(`Coupon ${data.code} applied`, 'success');
  };

  const discountAmount = appliedDiscount ? Math.min(subtotal, appliedDiscount.amount) : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingQuote.shipping_charge);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      if (authToken && saveAddressToAccount && !address.id) {
        await fetch('/api/addresses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(address),
        });
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          address,
          payment_method: paymentMethod,
          transaction_id: transactionId.trim(),
          coupon_code: appliedDiscount?.code || '',
          notes: orderNotes,
          items: cart.map((i) => ({
            product_id: i.product_id,
            color_id: i.color_id,
            size_id: i.size_id,
            variation_id: i.variation_id,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Checkout failed', 'error');
        return;
      }

      setLastCompletedOrder(data.order);
      clearCart();
      await refreshStore();
      showToast(`Order ${data.order.order_number} placed successfully`, 'success');
    } finally {
      setSubmitting(false);
    }
  };

  if (lastCompletedOrder && cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8 text-zinc-100">
        <div className="border border-[#C9A227] bg-zinc-950 text-white p-8 space-y-4">
          <div className="flex items-center gap-3 text-[#E4C76B]">
            <CheckCircle2 className="w-7 h-7" />
            <div>
              <p className="text-xs font-semibold tracking-[0.2em]">ORDER CONFIRMATION</p>
              <h1 className="font-display text-3xl font-semibold text-white">
                Order {lastCompletedOrder.order_number}
              </h1>
            </div>
          </div>
          <p className="text-sm text-zinc-300">
            Status: <span className="font-semibold text-white">{lastCompletedOrder.order_status}</span> · Payment:{' '}
            <span className="font-semibold text-[#E4C76B] uppercase">{lastCompletedOrder.payment_method}</span> (
            {lastCompletedOrder.payment_status})
          </p>
        </div>

        <div className="border border-zinc-800 p-6 sm:p-8 space-y-6 bg-zinc-900 text-zinc-100">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-white">Order Invoice</h2>
              <p className="text-xs text-zinc-400 font-mono">{lastCompletedOrder.created_at}</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 border border-zinc-600 text-white text-xs font-semibold flex items-center gap-2 hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-black transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1">
              <p className="font-semibold text-[#E4C76B]">Customer</p>
              <p className="text-white">{lastCompletedOrder.customer_name}</p>
              <p className="text-zinc-300">{lastCompletedOrder.customer_phone}</p>
              <p className="text-zinc-300">{lastCompletedOrder.customer_email}</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-[#E4C76B]">Delivery Address</p>
              <p className="text-zinc-200">
                {[
                  lastCompletedOrder.address.house_number,
                  lastCompletedOrder.address.road_number,
                  lastCompletedOrder.address.street_address,
                  lastCompletedOrder.address.area,
                  lastCompletedOrder.address.thana,
                  lastCompletedOrder.address.upazila,
                  lastCompletedOrder.address.district,
                  lastCompletedOrder.address.city,
                  lastCompletedOrder.address.country,
                  lastCompletedOrder.address.postal_code,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p className="text-zinc-400">Estimated Delivery: {lastCompletedOrder.estimated_delivery}</p>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4 space-y-3">
            {lastCompletedOrder.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs py-2 border-b border-zinc-800">
                <div>
                  <p className="font-semibold text-white">{item.product_name}</p>
                  <p className="text-zinc-400">
                    Qty {item.quantity} · {[item.color_name, item.size_label, item.model_name].filter(Boolean).join(' / ')}
                  </p>
                </div>
                <span className="font-mono tabular-nums font-semibold text-white">{formatPrice(item.line_total)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 text-xs pt-2">
            <div className="flex justify-between text-zinc-300">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatPrice(lastCompletedOrder.subtotal)}</span>
            </div>
            {lastCompletedOrder.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount ({lastCompletedOrder.coupon_code})</span>
                <span className="font-mono tabular-nums">-{formatPrice(lastCompletedOrder.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-300">
              <span>Shipping</span>
              <span className="font-mono tabular-nums">{formatPrice(lastCompletedOrder.shipping_charge)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-white pt-2 border-t border-zinc-800">
              <span>Final Total</span>
              <span className="font-mono tabular-nums text-[#E4C76B]">{formatPrice(lastCompletedOrder.final_total)}</span>
            </div>
          </div>

          <div className="bg-zinc-950 text-white border border-[#C9A227]/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-[#E4C76B]">BUYER EXCLUSIVE ACCESS</p>
              <p className="text-xs text-zinc-200">
                Download the SHOPNEXA ROBI HUB Buyer App to browse products and track your order in one tap.
              </p>
            </div>
            <PWAInstallButton variant="banner" label="Download SHOPNEXA ROBI HUB App" />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setLastCompletedOrder(null);
                navigate({ page: 'shop', filter: 'own' });
              }}
              className="px-5 py-2.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold transition-colors"
            >
              Continue Shopping
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'track', orderNumber: lastCompletedOrder.order_number })}
              className="px-5 py-2.5 border border-zinc-700 hover:border-[#C9A227] text-white text-xs font-semibold transition-colors"
            >
              Track Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4 text-zinc-100">
        <h1 className="font-display text-3xl font-semibold text-white">Direct Checkout</h1>
        <p className="text-sm text-zinc-300">Your cart has no direct-selling items to check out.</p>
        <button
          type="button"
          onClick={() => navigate({ page: 'shop', filter: 'own' })}
          className="px-6 py-3 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold transition-colors"
        >
          Browse Own Products
        </button>
      </div>
    );
  }

  const selectedGatewayMeta = availableGateways.find((g) => g.gateway === paymentMethod);
  const inputCls =
    'w-full bg-zinc-950 border border-zinc-700 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#C9A227] focus:outline-none';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-zinc-100">
      <div className="border-b border-zinc-800 pb-6 mb-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#E4C76B]">DIRECT CHECKOUT</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white mt-1">
          Delivery Address & Payment
        </h1>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left 7 cols: Personal Info, Dynamic Address, Payment */}
        <div className="lg:col-span-7 space-y-8">
          {savedAddresses.length > 0 && (
            <div className="border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <MapPin className="w-4 h-4 text-[#E4C76B]" />
                <span>Choose Saved Address</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedAddresses.map((sa) => (
                  <button
                    key={sa.id}
                    type="button"
                    onClick={() => setAddress(sa)}
                    className={`p-3 border text-left text-xs transition-colors ${
                      address.id === sa.id
                        ? 'border-[#C9A227] bg-zinc-950 text-white'
                        : 'border-zinc-700 bg-zinc-950/60 text-zinc-200 hover:border-[#C9A227]'
                    }`}
                  >
                    <p className="font-semibold text-white">{sa.label} — {sa.full_name}</p>
                    <p className="text-zinc-400 mt-0.5 truncate">
                      {[sa.area, sa.district || sa.city, sa.country].filter(Boolean).join(', ')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div className="border border-zinc-800 bg-zinc-900 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#E4C76B] uppercase tracking-wider">1. Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-200 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={address.full_name}
                  onChange={(e) => setAddress({ ...address, id: undefined, full_name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block font-medium text-zinc-200 mb-1">
                  {isBangladesh ? 'Mobile Number *' : 'Phone Number with Country Code *'}
                </label>
                <input
                  type="tel"
                  required
                  value={address.mobile}
                  onChange={(e) => setAddress({ ...address, id: undefined, mobile: e.target.value })}
                  placeholder={isBangladesh ? '+880 1XXX-XXXXXX' : '+1 555-0199'}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block font-medium text-zinc-200 mb-1">Alternative Phone Number</label>
                <input
                  type="tel"
                  value={address.alt_phone}
                  onChange={(e) => setAddress({ ...address, id: undefined, alt_phone: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block font-medium text-zinc-200 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={address.email}
                  onChange={(e) => setAddress({ ...address, id: undefined, email: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Dynamic Delivery Address */}
          <div className="border border-zinc-800 bg-zinc-900 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#E4C76B] uppercase tracking-wider">
                2. {isBangladesh ? 'Bangladesh Delivery Address' : 'International Delivery Address'}
              </h2>
              <select
                value={address.country}
                onChange={(e) => setAddress({ ...address, id: undefined, country: e.target.value })}
                className="border border-[#C9A227]/60 px-3 py-1.5 text-xs font-semibold bg-zinc-950 text-white focus:outline-none"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c} className="bg-zinc-950 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {isBangladesh ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">Division *</label>
                  <select
                    value={address.division}
                    onChange={(e) => setAddress({ ...address, id: undefined, division: e.target.value })}
                    className={inputCls}
                  >
                    {BD_DIVISIONS.map((d) => (
                      <option key={d} value={d} className="bg-zinc-950 text-white">{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">District *</label>
                  <input
                    type="text"
                    required
                    value={address.district}
                    onChange={(e) => setAddress({ ...address, id: undefined, district: e.target.value })}
                    placeholder="e.g. Dhaka, Chattogram, Sylhet"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">Upazila</label>
                  <input
                    type="text"
                    value={address.upazila}
                    onChange={(e) => setAddress({ ...address, id: undefined, upazila: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">Thana</label>
                  <input
                    type="text"
                    value={address.thana}
                    onChange={(e) => setAddress({ ...address, id: undefined, thana: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">Union</label>
                  <input
                    type="text"
                    value={address.union_name}
                    onChange={(e) => setAddress({ ...address, id: undefined, union_name: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">Municipality</label>
                  <input
                    type="text"
                    value={address.municipality}
                    onChange={(e) => setAddress({ ...address, id: undefined, municipality: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">City</label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, id: undefined, city: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">Village</label>
                  <input
                    type="text"
                    value={address.village}
                    onChange={(e) => setAddress({ ...address, id: undefined, village: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">Area / Sector *</label>
                  <input
                    type="text"
                    required
                    value={address.area}
                    onChange={(e) => setAddress({ ...address, id: undefined, area: e.target.value })}
                    placeholder="e.g. Jahaj Company More, Lalbag, Gulshan-2"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">Road Number</label>
                  <input
                    type="text"
                    value={address.road_number}
                    onChange={(e) => setAddress({ ...address, id: undefined, road_number: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">House Number</label>
                  <input
                    type="text"
                    value={address.house_number}
                    onChange={(e) => setAddress({ ...address, id: undefined, house_number: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">Apartment Number</label>
                  <input
                    type="text"
                    value={address.apartment_number}
                    onChange={(e) => setAddress({ ...address, id: undefined, apartment_number: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">Floor Number</label>
                  <input
                    type="text"
                    value={address.floor_number}
                    onChange={(e) => setAddress({ ...address, id: undefined, floor_number: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">Postal Code *</label>
                  <input
                    type="text"
                    required
                    value={address.postal_code}
                    onChange={(e) => setAddress({ ...address, id: undefined, postal_code: e.target.value })}
                    placeholder="e.g. 1212"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">Nearby Landmark</label>
                  <input
                    type="text"
                    value={address.landmark}
                    onChange={(e) => setAddress({ ...address, id: undefined, landmark: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block font-medium text-zinc-200 mb-1">Additional Delivery Instructions</label>
                  <textarea
                    rows={2}
                    value={address.instructions}
                    onChange={(e) => setAddress({ ...address, id: undefined, instructions: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">State / Province / Region *</label>
                  <input
                    type="text"
                    required
                    value={address.state_province}
                    onChange={(e) => setAddress({ ...address, id: undefined, state_province: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, id: undefined, city: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">District (if applicable)</label>
                  <input
                    type="text"
                    value={address.district}
                    onChange={(e) => setAddress({ ...address, id: undefined, district: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">Postal / ZIP Code *</label>
                  <input
                    type="text"
                    required
                    value={address.postal_code}
                    onChange={(e) => setAddress({ ...address, id: undefined, postal_code: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium text-zinc-200 mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={address.street_address}
                    onChange={(e) => setAddress({ ...address, id: undefined, street_address: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">House / Apartment Number</label>
                  <input
                    type="text"
                    value={address.apartment_number}
                    onChange={(e) => setAddress({ ...address, id: undefined, apartment_number: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-200 mb-1">Delivery Instructions</label>
                  <input
                    type="text"
                    value={address.instructions}
                    onChange={(e) => setAddress({ ...address, id: undefined, instructions: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            )}

            {authToken && !address.id && (
              <label className="flex items-center gap-2 text-xs text-zinc-300 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAddressToAccount}
                  onChange={(e) => setSaveAddressToAccount(e.target.checked)}
                />
                <span>Save this delivery address to my SHOPNEXA ROBI HUB account</span>
              </label>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="border border-zinc-800 bg-zinc-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#E4C76B] uppercase tracking-wider">3. Payment Method</h2>
              <span className="text-xs text-zinc-300 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-[#E4C76B]" />
                <span>No PIN or OTP collected</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {availableGateways.map((gw) => (
                <button
                  key={gw.gateway}
                  type="button"
                  onClick={() => setPaymentMethod(gw.gateway)}
                  className={`p-3.5 border text-left text-xs transition-colors ${
                    paymentMethod === gw.gateway
                      ? 'border-[#C9A227] bg-[#C9A227] text-black'
                      : 'border-zinc-700 bg-zinc-950 text-white hover:border-[#C9A227]'
                  }`}
                >
                  <p className="font-semibold">{gw.display_name}</p>
                  <p className={`text-[11px] mt-1 ${paymentMethod === gw.gateway ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                    {gw.gateway === 'cod'
                      ? 'Pay on delivery'
                      : gw.env_configured
                      ? 'Authorized Gateway API'
                      : 'Merchant TrxID Verification'}
                  </p>
                </button>
              ))}
            </div>

            {selectedGatewayMeta && (
              <div className="bg-zinc-950 border border-zinc-800 p-4 space-y-3 text-xs">
                <p className="text-zinc-200 leading-relaxed">{selectedGatewayMeta.instructions}</p>
                {selectedGatewayMeta.merchant_number && (
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-black text-white border border-[#C9A227]/60 px-4 py-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#E4C76B] font-semibold">
                        {selectedGatewayMeta.display_name} Number
                      </p>
                      <p className="font-mono text-base font-semibold tracking-wider mt-0.5">
                        {selectedGatewayMeta.merchant_number}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(selectedGatewayMeta.merchant_number);
                        setCopiedWallet(true);
                        showToast('Payment number copied', 'success');
                        setTimeout(() => setCopiedWallet(false), 2000);
                      }}
                      className="px-3 py-1.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      {copiedWallet ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWallet ? 'Copied' : 'Copy Number'}</span>
                    </button>
                  </div>
                )}
                {(paymentMethod === 'bkash' || paymentMethod === 'nagad' || paymentMethod === 'international_card') && (
                  <div>
                    <label className="block font-semibold text-white mb-1">
                      Transaction ID / Payment Reference *
                    </label>
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder={
                        paymentMethod === 'bkash'
                          ? 'Enter bKash TrxID (never enter PIN/OTP)'
                          : paymentMethod === 'nagad'
                          ? 'Enter Nagad Transaction ID (never enter PIN/OTP)'
                          : 'Enter Gateway Reference ID'
                      }
                      className="w-full border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-400 px-3 py-2.5 font-mono text-xs focus:border-[#C9A227] focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="text-xs">
              <label className="block font-medium text-zinc-200 mb-1">Order Notes (Optional)</label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Any special request for fulfillment"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Right 5 cols: Complete Order Summary */}
        <div className="lg:col-span-5">
          <div className="border border-zinc-800 bg-zinc-900 p-6 space-y-5 sticky top-24">
            <h2 className="font-display text-2xl font-semibold text-white">Order Summary</h2>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {cart.map((item) => {
                const unitPrice =
                  item.selected_variation?.price ??
                  item.selected_size?.price_override ??
                  item.selected_color?.price_override ??
                  (item.product.sale_price > 0 ? item.product.sale_price : item.product.selling_price);
                return (
                  <div key={item.id} className="flex gap-3 pb-3 border-b border-zinc-800 text-xs">
                    <div className="w-14 h-14 bg-white border border-zinc-700 shrink-0 overflow-hidden">
                      <SmartImage
                        src={item.selected_color?.images?.[0] || item.product.images[0]}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white line-clamp-1">{item.product.name}</p>
                      <p className="text-zinc-400 mt-0.5">
                        {[item.selected_color?.name, item.selected_size?.label, item.selected_variation?.model_name]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="font-mono text-zinc-300 mt-0.5">
                        {item.quantity} × {formatPrice(unitPrice)}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums font-semibold text-[#E4C76B]">
                      {formatPrice(unitPrice * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Coupon */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Coupon code"
                  className="w-full bg-zinc-950 border border-zinc-700 text-white placeholder:text-zinc-400 pl-8 pr-3 py-2 text-xs focus:border-[#C9A227] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={(e) => void handleApplyCoupon(e)}
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 hover:border-[#C9A227] text-white text-xs font-semibold transition-colors"
              >
                Apply
              </button>
            </div>

            <div className="space-y-2 text-xs border-t border-zinc-800 pt-4">
              <div className="flex justify-between text-zinc-300">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Discount ({appliedDiscount?.code})</span>
                  <span className="font-mono tabular-nums">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-300">
                <span>Shipping ({shippingQuote.zone_name})</span>
                <span className="font-mono tabular-nums">
                  {shippingQuote.shipping_charge === 0 ? 'Free' : formatPrice(shippingQuote.shipping_charge)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Tax</span>
                <span className="font-mono tabular-nums">{formatPrice(0)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-white pt-3 border-t border-zinc-800">
                <span>Final Total</span>
                <span className="font-mono tabular-nums text-[#E4C76B]">{formatPrice(finalTotal)}</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Estimated Delivery: {shippingQuote.estimated_days}
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{submitting ? 'Confirming Order...' : 'Confirm & Place Direct Order'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
