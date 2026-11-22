import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Package,
  Link2,
  ShoppingCart,
  Users,
  Truck,
  CreditCard,
  Tag,
  MessageSquare,
  Settings,
  Download,
  LogOut,
  Plus,
  Trash2,
  Edit3,
  Printer,
  Send,
  Shield,
  ExternalLink,
  KeyRound,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import type {
  Product,
  Order,
  Coupon,
  Review,
  ShippingZone,
  CourierService,
  PaymentSetting,
  SiteSettings,
} from '../types.ts';
import { AdminProductEditor } from './AdminProductEditor.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'affiliates'
  | 'orders'
  | 'customers'
  | 'shipping'
  | 'payments'
  | 'coupons'
  | 'reviews'
  | 'social'
  | 'settings';

export function AdminDashboard() {
  const {
    adminToken,
    setAdminSession,
    logoutAdmin,
    categories,
    settings,
    formatPrice,
    refreshStore,
    showToast,
  } = useStore();

  const [authStatus, setAuthStatus] = useState<{
    envConfigured: boolean;
    needsInitialSetup: boolean;
    requiresUsername?: boolean;
    requiresGmailVerification?: boolean;
  } | null>(null);
  const [adminUsername, setAdminUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [gmailInput, setGmailInput] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [loginStep, setLoginStep] = useState<'credentials' | 'gmail'>('credentials');
  const [adminDisplayName, setAdminDisplayName] = useState('');
  const [zipBusy, setZipBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [credForm, setCredForm] = useState({ currentPasscode: '', newUsername: '', newPasscode: '', newGmail: '' });
  const [credBusy, setCredBusy] = useState(false);

  const [tab, setTab] = useState<AdminTab>('overview');
  const [daysFilter, setDaysFilter] = useState(30);
  const [analytics, setAnalytics] = useState<any>(null);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [affiliateReports, setAffiliateReports] = useState<{ clicks: any[]; byProduct: any[] }>({
    clicks: [],
    byProduct: [],
  });
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [shippingData, setShippingData] = useState<{ zones: ShippingZone[]; couriers: CourierService[] }>({
    zones: [],
    couriers: [],
  });
  const [paymentData, setPaymentData] = useState<{ settings: PaymentSetting[]; records: any[] }>({
    settings: [],
    records: [],
  });
  const [errorLogs, setErrorLogs] = useState<any[]>([]);

  const [editingProduct, setEditingProduct] = useState<{ open: boolean; product: Product | null; defaultType: 'own' | 'affiliate' }>({
    open: false,
    product: null,
    defaultType: 'own',
  });

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_value: 0,
    max_uses: 100,
    expires_at: '',
    campaign_name: '',
  });
  const [newZone, setNewZone] = useState({
    name: '',
    country: 'Bangladesh',
    district: '',
    area: '',
    base_fee: 2,
    free_shipping_threshold: 100,
    estimated_days: '2–4 Business Days',
  });
  const [newCourier, setNewCourier] = useState({
    name: '',
    contact_phone: '',
    tracking_url_template: '',
    supported_regions: 'Bangladesh',
    base_rate: 2,
  });
  const [siteForm, setSiteForm] = useState<SiteSettings | null>(settings);

  useEffect(() => {
    setSiteForm(settings);
  }, [settings]);

  useEffect(() => {
    fetch('/api/admin/auth/status')
      .then((r) => r.json())
      .then(setAuthStatus)
      .catch(() => {});
  }, []);

  const loadAllAdminData = useCallback(async () => {
    if (!adminToken) return;
    const headers = { Authorization: `Bearer ${adminToken}` };
    const [an, pr, or, cu, af, cp, rv, sh, py, lg, me] = await Promise.all([
      fetch(`/api/admin/analytics?days=${daysFilter}`, { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/products', { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/admin/orders', { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/admin/customers', { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/admin/affiliate-reports', { headers }).then((r) => (r.ok ? r.json() : { clicks: [], byProduct: [] })),
      fetch('/api/admin/coupons', { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/admin/reviews', { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/admin/shipping', { headers }).then((r) => (r.ok ? r.json() : { zones: [], couriers: [] })),
      fetch('/api/admin/payments', { headers }).then((r) => (r.ok ? r.json() : { settings: [], records: [] })),
      fetch('/api/admin/error-logs', { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/admin/auth/me', { headers }).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (an) setAnalytics(an);
    if (me?.username) setAdminDisplayName(me.username);
    setAdminProducts(pr);
    setOrders(or);
    setCustomers(cu);
    setAffiliateReports(af);
    setCoupons(cp);
    setReviews(rv);
    setShippingData(sh);
    setPaymentData(py);
    setErrorLogs(lg);
  }, [adminToken, daysFilter]);

  useEffect(() => {
    void loadAllAdminData();
  }, [loadAllAdminData]);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    try {
      if (authStatus?.needsInitialSetup) {
        const res = await fetch('/api/admin/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: adminUsername.trim(), passcode, gmail: gmailInput.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Authentication failed', 'error');
          return;
        }
        setAdminSession(data.token);
        setPasscode('');
        setGmailInput('');
        showToast('Admin session authenticated', 'success');
        return;
      }

      if (loginStep === 'credentials') {
        const res = await fetch('/api/admin/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: adminUsername.trim(), passcode }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Authentication failed', 'error');
          return;
        }
        if (data.requiresGmailVerification && data.challengeToken) {
          setChallengeToken(data.challengeToken);
          setPasscode('');
          setGmailInput('');
          setLoginStep('gmail');
          showToast('Credentials verified. Complete Gmail verification.', 'info');
          return;
        }
        if (data.token) {
          setAdminSession(data.token);
          setPasscode('');
          showToast('Admin session authenticated', 'success');
        }
        return;
      }

      const res = await fetch('/api/admin/auth/verify-gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken, gmail: gmailInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gmail verification failed', 'error');
        return;
      }
      setAdminSession(data.token);
      if (data.username) setAdminDisplayName(data.username);
      setGmailInput('');
      setChallengeToken('');
      setLoginStep('credentials');
      showToast('Admin session authenticated', 'success');
    } finally {
      setAuthBusy(false);
    }
  };

  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="border border-[#C9A227]/40 bg-zinc-950 text-white p-8 space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 text-[#E4C76B]">
            {loginStep === 'gmail' ? <KeyRound className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
            <div>
              <p className="text-xs font-semibold tracking-[0.2em]">SHOPNEXA ROBI HUB CONSOLE</p>
              <h1 className="font-display text-3xl font-semibold text-white">
                {authStatus?.needsInitialSetup
                  ? 'Claim Administrator Access'
                  : loginStep === 'gmail'
                  ? 'Gmail Verification'
                  : 'Administrator Sign In'}
              </h1>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            {authStatus?.needsInitialSetup
              ? 'First-run security setup: configure your Administrator username and password (min 6 characters).'
              : loginStep === 'gmail'
              ? 'Step 2 of 2: Enter your authorized administrator Gmail address to unlock the dashboard. Input is masked for privacy.'
              : 'Step 1 of 2: Enter your Administrator name and password to proceed to Gmail verification.'}
          </p>

          <form onSubmit={handleAdminAuth} className="space-y-4 text-xs" autoComplete="off">
            {loginStep === 'credentials' || authStatus?.needsInitialSetup ? (
              <>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Admin Name</label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="Enter admin name"
                    className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-white focus:border-[#C9A227] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Admin Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder={authStatus?.needsInitialSetup ? 'Create admin password' : 'Enter admin password'}
                    className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-white focus:border-[#C9A227] focus:outline-none"
                  />
                </div>
                {authStatus?.needsInitialSetup && (
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Authorized Gmail</label>
                    <input
                      type="password"
                      required
                      autoComplete="off"
                      spellCheck={false}
                      value={gmailInput}
                      onChange={(e) => setGmailInput(e.target.value)}
                      placeholder="Enter authorized admin Gmail"
                      className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-white focus:border-[#C9A227] focus:outline-none"
                    />
                  </div>
                )}
              </>
            ) : (
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Authorized Gmail</label>
                <input
                  type="password"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  value={gmailInput}
                  onChange={(e) => setGmailInput(e.target.value)}
                  placeholder="Enter authorized admin Gmail"
                  className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-white focus:border-[#C9A227] focus:outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={authBusy}
              className="w-full py-3 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold transition-colors"
            >
              {authBusy
                ? 'Verifying...'
                : authStatus?.needsInitialSetup
                ? 'Save & Enter Dashboard'
                : loginStep === 'gmail'
                ? 'Verify Gmail & Enter Dashboard'
                : 'Continue to Gmail Verification'}
            </button>

            {loginStep === 'gmail' && !authStatus?.needsInitialSetup && (
              <button
                type="button"
                onClick={() => {
                  setLoginStep('credentials');
                  setChallengeToken('');
                  setGmailInput('');
                }}
                className="w-full py-2.5 border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-medium transition-colors"
              >
                Back to Admin Name & Password
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'All' && o.order_status !== orderStatusFilter) return false;
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      return `${o.order_number} ${o.customer_name} ${o.customer_phone} ${o.customer_email}`.toLowerCase().includes(q);
    }
    return true;
  });

  const triggerNativeUrlDownload = (downloadUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
    }, 5000);
  };

  const exportOrdersCsv = () => {
    const header = ['OrderID', 'Customer', 'Phone', 'Country', 'Payment', 'PayStatus', 'Status', 'Total', 'Date'];
    const rows = filteredOrders.map((o) => [
      o.order_number,
      `"${o.customer_name}"`,
      `"${o.customer_phone}"`,
      o.country,
      o.payment_method,
      o.payment_status,
      o.order_status,
      o.final_total,
      o.created_at,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopnexa-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 15000);
  };

  const handleDownloadBackup = async () => {
    try {
      const ticketRes = await fetch('/api/admin/download-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ type: 'backup' }),
      });
      if (ticketRes.status === 401 || ticketRes.status === 403) {
        logoutAdmin();
        showToast('Admin session expired. Please sign in again.', 'error');
        return;
      }
      if (ticketRes.ok) {
        const { ticket } = (await ticketRes.json()) as { ticket?: string };
        if (ticket) {
          triggerNativeUrlDownload(
            `/api/admin/backup?ticket=${encodeURIComponent(ticket)}`,
            `shopnexa-backup-${new Date().toISOString().slice(0, 10)}.db`
          );
          showToast('Database backup download started', 'success');
          return;
        }
      }
      showToast('Backup download failed', 'error');
    } catch {
      showToast('Backup download failed', 'error');
    }
  };

  const handleDownloadFullZip = async () => {
    setZipBusy(true);
    try {
      const ticketRes = await fetch('/api/admin/download-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ type: 'zip' }),
      });
      if (ticketRes.status === 401 || ticketRes.status === 403) {
        logoutAdmin();
        showToast('Admin session expired. Please sign in again.', 'error');
        return;
      }
      if (ticketRes.ok) {
        const { ticket } = (await ticketRes.json()) as { ticket?: string };
        if (ticket) {
          triggerNativeUrlDownload(
            `/api/admin/export-zip?ticket=${encodeURIComponent(ticket)}`,
            `shopnexa-complete-a-to-z-backup-${new Date().toISOString().slice(0, 10)}.zip`
          );
          showToast('Complete A-to-Z Website ZIP download started', 'success');
          return;
        }
      }
      showToast('Full website ZIP export failed', 'error');
    } catch {
      showToast('Full website ZIP export failed', 'error');
    } finally {
      setZipBusy(false);
    }
  };

  const navItems: Array<{ id: AdminTab; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products (Own & Affiliate)', icon: Package },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'affiliates', label: 'Affiliate Reports', icon: Link2 },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'shipping', label: 'Shipping & Couriers', icon: Truck },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'reviews', label: 'Reviews & Q&A', icon: MessageSquare },
    { id: 'social', label: 'Social Media & Telegram', icon: Send },
    { id: 'settings', label: 'Website, Credentials & Backup', icon: Settings },
  ];

  const maxChartRev = Math.max(1, ...(analytics?.salesSeries || []).map((s: any) => s.revenue));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="bg-black text-white border-b border-[#C9A227]/35 px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#E4C76B]">SHOPNEXA ROBI HUB CONTROL CENTER</p>
          <h1 className="font-display text-2xl font-semibold text-white">Administrator Dashboard</h1>
          {adminDisplayName && (
            <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
              Private Admin Session: <span className="text-[#E4C76B] font-semibold">{adminDisplayName}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <PWAInstallButton variant="header" label="Download App" />
          <button
            type="button"
            disabled={zipBusy}
            onClick={() => void handleDownloadFullZip()}
            className="px-4 py-2 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{zipBusy ? 'Preparing ZIP...' : 'Download Full Website ZIP (A–Z)'}</span>
          </button>
          <button
            type="button"
            onClick={logoutAdmin}
            className="px-4 py-2 border border-zinc-700 hover:border-[#C9A227] text-zinc-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center gap-2.5 border transition-colors ${
                  active
                    ? 'bg-[#C9A227] text-black border-[#C9A227]'
                    : 'bg-zinc-900 text-zinc-200 border-zinc-800 hover:border-[#C9A227]/60 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-black' : 'text-[#E4C76B]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        <main className="lg:col-span-9 space-y-6">
          {/* 1. OVERVIEW */}
          {tab === 'overview' && analytics && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-display text-2xl font-semibold text-white">Marketplace Overview</h2>
                <select
                  value={daysFilter}
                  onChange={(e) => setDaysFilter(Number(e.target.value))}
                  className="border border-zinc-700 bg-zinc-900 text-white px-3 py-1.5 text-xs font-semibold focus:border-[#C9A227] focus:outline-none"
                >
                  <option value={7} className="bg-zinc-950 text-white">Last 7 Days</option>
                  <option value={30} className="bg-zinc-950 text-white">Last 30 Days</option>
                  <option value={90} className="bg-zinc-950 text-white">Last 90 Days</option>
                  <option value={365} className="bg-zinc-950 text-white">Last 365 Days</option>
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
                {[
                  { label: 'Total Revenue', val: formatPrice(analytics.metrics.totalRevenue) },
                  { label: 'Total Sales', val: analytics.metrics.totalSales },
                  { label: 'Total Orders', val: analytics.metrics.totalOrders },
                  { label: 'Pending Orders', val: analytics.metrics.pendingOrders },
                  { label: 'Confirmed Orders', val: analytics.metrics.confirmedOrders },
                  { label: 'Delivered Orders', val: analytics.metrics.deliveredOrders },
                  { label: 'Cancelled Orders', val: analytics.metrics.cancelledOrders },
                  { label: 'Total Customers', val: analytics.metrics.totalCustomers },
                  { label: 'Total Products', val: analytics.metrics.totalProducts },
                  { label: 'Own Products', val: analytics.metrics.ownProductCount },
                  { label: 'Affiliate Products', val: analytics.metrics.affiliateProductCount },
                  { label: 'Total Direct Stock', val: analytics.metrics.totalStock },
                  { label: 'Low Stock Alerts', val: analytics.metrics.lowStockCount },
                  { label: 'Affiliate Clicks', val: analytics.metrics.affiliateClicks },
                ].map((m) => (
                  <div key={m.label} className="bg-zinc-900 border border-zinc-800 p-4">
                    <p className="text-zinc-400">{m.label}</p>
                    <p className="text-lg font-mono tabular-nums font-semibold text-white mt-1">{m.val}</p>
                  </div>
                ))}
              </div>

              {/* SVG Sales & Clicks Chart */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white">Sales Revenue & Activity Timeline</h3>
                {analytics.salesSeries.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-8 text-center">
                    No order or affiliate click activity recorded in this period yet.
                  </p>
                ) : (
                  <div className="h-44 flex items-end gap-2 border-b border-l border-zinc-700 p-3 overflow-x-auto">
                    {analytics.salesSeries.map((pt: any) => {
                      const heightPct = Math.max(8, Math.round((pt.revenue / maxChartRev) * 100));
                      return (
                        <div key={pt.date} className="flex-1 min-w-[36px] flex flex-col items-center gap-1">
                          <span className="text-[10px] font-mono text-zinc-300">{pt.orders}o/{pt.clicks}c</span>
                          <div
                            title={`${pt.date}: $${pt.revenue}`}
                            className="w-full max-w-[32px] bg-[#C9A227] hover:bg-[#E4C76B] transition-colors"
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="text-[10px] font-mono text-zinc-400">{pt.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-5 space-y-3 text-xs">
                  <h3 className="text-sm font-semibold text-white">Low Stock Direct Products</h3>
                  {analytics.lowStockProducts.length === 0 ? (
                    <p className="text-zinc-400">All direct products are adequately stocked.</p>
                  ) : (
                    analytics.lowStockProducts.map((p: Product) => (
                      <div key={p.id} className="flex justify-between py-2 border-b border-zinc-800">
                        <span className="font-medium text-zinc-200">{p.name}</span>
                        <span className="font-mono text-red-400 font-semibold">{p.total_stock} left</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-5 space-y-3 text-xs">
                  <h3 className="text-sm font-semibold text-white">Recent Orders</h3>
                  {analytics.recentOrders.length === 0 ? (
                    <p className="text-zinc-400">No direct orders placed yet.</p>
                  ) : (
                    analytics.recentOrders.map((o: Order) => (
                      <div key={o.id} className="flex justify-between py-2 border-b border-zinc-800">
                        <div>
                          <span className="font-mono font-semibold text-white">{o.order_number}</span>
                          <span className="text-zinc-400 ml-2">{o.customer_name}</span>
                        </div>
                        <span className="font-mono font-semibold text-[#E4C76B]">{formatPrice(o.final_total)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. PRODUCTS */}
          {tab === 'products' && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-semibold text-white">Products Management</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct({ open: true, product: null, defaultType: 'own' })}
                    className="px-4 py-2 bg-zinc-950 border border-zinc-700 hover:border-[#C9A227] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Own Product</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProduct({ open: true, product: null, defaultType: 'affiliate' })}
                    className="px-4 py-2 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Affiliate Product</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-950 text-[#E4C76B] border-b border-zinc-800">
                    <tr>
                      <th className="px-3 py-2.5">Code / SKU</th>
                      <th className="px-3 py-2.5">Name</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Price</th>
                      <th className="px-3 py-2.5">Colors / Sizes / Vars</th>
                      <th className="px-3 py-2.5">Stock</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {adminProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-950/60">
                        <td className="px-3 py-2.5 font-mono text-zinc-300">{p.product_code}</td>
                        <td className="px-3 py-2.5 font-semibold text-white">{p.name}</td>
                        <td className="px-3 py-2.5 uppercase font-semibold text-zinc-300">
                          {p.product_type === 'affiliate' ? 'Affiliate' : 'Own Direct'}
                        </td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-white">{formatPrice(p.sale_price || p.selling_price)}</td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-zinc-300">
                          {p.total_colors}C / {p.total_sizes}S / {p.total_variations}V
                        </td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-white">{p.total_stock}</td>
                        <td className="px-3 py-2.5 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => setEditingProduct({ open: true, product: p, defaultType: p.product_type })}
                            className="text-zinc-200 hover:text-[#E4C76B] inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await fetch(`/api/admin/products/${p.id}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${adminToken}` },
                              });
                              if (res.ok) {
                                await loadAllAdminData();
                                await refreshStore();
                              } else {
                                const d = await res.json();
                                showToast(d.error || 'Cannot delete', 'error');
                              }
                            }}
                            className="text-red-400 hover:text-red-300 inline-flex items-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. CATEGORIES */}
          {tab === 'categories' && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-6 text-xs">
              <h2 className="font-display text-2xl font-semibold text-white">Categories Management ({categories.length})</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch('/api/admin/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                    body: JSON.stringify({ name: newCategoryName, is_featured: true }),
                  });
                  if (res.ok) {
                    setNewCategoryName('');
                    await refreshStore();
                    showToast('Category added', 'success');
                  }
                }}
                className="flex gap-2 max-w-md"
              >
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none"
                />
                <button type="submit" className="px-4 py-2 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold">
                  Add Category
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((cat) => (
                  <div key={cat.id} className="border border-zinc-800 bg-zinc-950 p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{cat.name}</p>
                      <p className="text-zinc-400 font-mono">{cat.product_count ?? 0} products</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch(`/api/admin/categories/${cat.id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${adminToken}` },
                        });
                        if (res.ok) await refreshStore();
                        else showToast('Remove products in this category first', 'error');
                      }}
                      className="text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. PRIVATE AFFILIATE CATALOG & REPORTS (Admin Only) */}
          {tab === 'affiliates' && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-6 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-white">Private Affiliate Products & Reports</h2>
                  <p className="text-zinc-300 mt-0.5">
                    Private Admin Vault: affiliate products added here are visible only inside your Admin Dashboard and never shown to public visitors.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProduct({ open: true, product: null, defaultType: 'affiliate' })}
                  className="px-4 py-2 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold"
                >
                  + Add Affiliate Product
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-white">
                  Your Affiliate Products ({adminProducts.filter((p) => p.product_type === 'affiliate').length})
                </h3>
                <div className="overflow-x-auto border border-zinc-800">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-950 text-[#E4C76B] border-b border-zinc-800">
                      <tr>
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">Price</th>
                        <th className="px-3 py-2">Affiliate Link</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {adminProducts.filter((p) => p.product_type === 'affiliate').length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-zinc-400">
                            No affiliate products added yet.
                          </td>
                        </tr>
                      ) : (
                        adminProducts
                          .filter((p) => p.product_type === 'affiliate')
                          .map((p) => (
                            <tr key={p.id} className="hover:bg-zinc-950/60">
                              <td className="px-3 py-2.5 font-mono text-zinc-300">{p.product_code}</td>
                              <td className="px-3 py-2.5 font-semibold text-white">{p.name}</td>
                              <td className="px-3 py-2.5 font-mono tabular-nums text-white">
                                {formatPrice(p.sale_price || p.selling_price)}
                              </td>
                              <td className="px-3 py-2.5 max-w-xs truncate">
                                {p.affiliate_url ? (
                                  <a
                                    href={p.affiliate_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#E4C76B] hover:underline inline-flex items-center gap-1 font-mono"
                                  >
                                    <span>Open Affiliate Link</span>
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                ) : (
                                  <span className="text-zinc-500">No URL</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingProduct({ open: true, product: p, defaultType: 'affiliate' })}
                                  className="text-zinc-200 hover:text-[#E4C76B] inline-flex items-center gap-1"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const res = await fetch(`/api/admin/products/${p.id}`, {
                                      method: 'DELETE',
                                      headers: { Authorization: `Bearer ${adminToken}` },
                                    });
                                    if (res.ok) {
                                      await loadAllAdminData();
                                      await refreshStore();
                                    } else {
                                      const d = await res.json();
                                      showToast(d.error || 'Cannot delete', 'error');
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-300 inline-flex items-center"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full text-left">
                  <thead className="bg-zinc-950 text-[#E4C76B] border-b border-zinc-800">
                    <tr>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">Affiliate URL</th>
                      <th className="px-3 py-2 text-right">Tracked Clicks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {affiliateReports.byProduct.map((row: any) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 font-mono text-zinc-300">{row.product_code}</td>
                        <td className="px-3 py-2 font-semibold text-white">{row.name}</td>
                        <td className="px-3 py-2 font-mono truncate max-w-xs">
                          {row.affiliate_url ? (
                            <a
                              href={row.affiliate_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#E4C76B] hover:underline"
                            >
                              {row.affiliate_url}
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono tabular-nums text-right font-semibold text-white">{row.click_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">Recent Affiliate Click Log ({affiliateReports.clicks.length})</h3>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {affiliateReports.clicks.map((c: any) => (
                    <div key={c.id} className="border border-zinc-800 bg-zinc-950 p-2.5 flex justify-between">
                      <span className="text-zinc-200">{c.product_name} ({[c.selected_color, c.selected_size].filter(Boolean).join(', ') || 'Default'})</span>
                      <span className="font-mono text-zinc-400">{c.clicked_at}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. ORDERS */}
          {tab === 'orders' && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-semibold text-white">Orders Management ({filteredOrders.length})</h2>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="search"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search Order ID, customer..."
                    className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-3 py-1.5 focus:border-[#C9A227] focus:outline-none"
                  />
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="border border-zinc-700 px-3 py-1.5 bg-zinc-950 text-white focus:border-[#C9A227] focus:outline-none"
                  >
                    <option value="All" className="bg-zinc-950 text-white">All Statuses</option>
                    {['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded'].map((s) => (
                      <option key={s} value={s} className="bg-zinc-950 text-white">{s}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={exportOrdersCsv}
                    className="px-3 py-1.5 border border-zinc-700 hover:border-[#C9A227] text-zinc-200 hover:text-white font-semibold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full text-left">
                  <thead className="bg-zinc-950 text-[#E4C76B] border-b border-zinc-800">
                    <tr>
                      <th className="px-3 py-2">Order ID</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Payment</th>
                      <th className="px-3 py-2">Total</th>
                      <th className="px-3 py-2">Order Status</th>
                      <th className="px-3 py-2 text-right">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-zinc-950/60">
                        <td className="px-3 py-2.5 font-mono font-semibold text-white">{o.order_number}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-white">{o.customer_name}</p>
                          <p className="text-zinc-400">{o.customer_phone} · {o.country}</p>
                        </td>
                        <td className="px-3 py-2.5 uppercase text-zinc-300">
                          {o.payment_method} ({o.payment_status})
                        </td>
                        <td className="px-3 py-2.5 font-mono tabular-nums font-semibold text-white">{formatPrice(o.final_total)}</td>
                        <td className="px-3 py-2.5 font-semibold text-[#E4C76B]">{o.order_status}</td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(o)}
                            className="px-3 py-1 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold transition-colors"
                          >
                            Inspect / Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedOrder && (
                <div className="border-2 border-[#C9A227]/60 p-5 space-y-4 bg-zinc-950 text-zinc-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold font-mono text-white">Manage Order {selectedOrder.order_number}</h3>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => window.print()} className="px-3 py-1 border border-zinc-700 hover:border-[#C9A227] text-zinc-200 flex items-center gap-1">
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Invoice</span>
                      </button>
                      <button type="button" onClick={() => setSelectedOrder(null)} className="px-2 py-1 border border-zinc-700 hover:border-zinc-500 text-zinc-200">Close</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold text-white">Delivery Address</p>
                      <p className="text-zinc-300 mt-1">
                        {[
                          selectedOrder.address.house_number,
                          selectedOrder.address.road_number,
                          selectedOrder.address.area,
                          selectedOrder.address.thana,
                          selectedOrder.address.upazila,
                          selectedOrder.address.district,
                          selectedOrder.address.city,
                          selectedOrder.address.country,
                          selectedOrder.address.postal_code,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                      {selectedOrder.transaction_id && (
                        <p className="font-mono text-[#E4C76B] mt-1">Transaction ID: {selectedOrder.transaction_id}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-medium text-zinc-300 mb-1">Order Status</label>
                        <select
                          value={selectedOrder.order_status}
                          onChange={(e) => setSelectedOrder({ ...selectedOrder, order_status: e.target.value as any })}
                          className="w-full border border-zinc-700 bg-zinc-900 text-white px-2 py-1.5 focus:border-[#C9A227] focus:outline-none"
                        >
                          {['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded'].map((s) => (
                            <option key={s} value={s} className="bg-zinc-950 text-white">{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium text-zinc-300 mb-1">Payment Status</label>
                        <select
                          value={selectedOrder.payment_status}
                          onChange={(e) => setSelectedOrder({ ...selectedOrder, payment_status: e.target.value as any })}
                          className="w-full border border-zinc-700 bg-zinc-900 text-white px-2 py-1.5 focus:border-[#C9A227] focus:outline-none"
                        >
                          {['pending', 'verified', 'paid', 'failed', 'refunded'].map((s) => (
                            <option key={s} value={s} className="bg-zinc-950 text-white">{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium text-zinc-300 mb-1">Courier Service</label>
                        <select
                          value={selectedOrder.courier_id ?? ''}
                          onChange={(e) =>
                            setSelectedOrder({ ...selectedOrder, courier_id: e.target.value ? Number(e.target.value) : null })
                          }
                          className="w-full border border-zinc-700 bg-zinc-900 text-white px-2 py-1.5 focus:border-[#C9A227] focus:outline-none"
                        >
                          <option value="" className="bg-zinc-950 text-white">Select Courier</option>
                          {shippingData.couriers.map((c) => (
                            <option key={c.id} value={c.id} className="bg-zinc-950 text-white">{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium text-zinc-300 mb-1">Tracking Number</label>
                        <input
                          type="text"
                          value={selectedOrder.tracking_number}
                          onChange={(e) => setSelectedOrder({ ...selectedOrder, tracking_number: e.target.value })}
                          className="w-full border border-zinc-700 bg-zinc-900 text-white px-2 py-1.5 font-mono focus:border-[#C9A227] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                        body: JSON.stringify(selectedOrder),
                      });
                      if (res.ok) {
                        showToast('Order updated', 'success');
                        await loadAllAdminData();
                      }
                    }}
                    className="px-5 py-2 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold transition-colors"
                  >
                    Save Order Update
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 6. CUSTOMERS */}
          {tab === 'customers' && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 text-xs">
              <h2 className="font-display text-2xl font-semibold text-white">Customers ({customers.length})</h2>
              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full text-left">
                  <thead className="bg-zinc-950 text-[#E4C76B] border-b border-zinc-800">
                    <tr>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Contact</th>
                      <th className="px-3 py-2">Orders / Spent</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-950/60">
                        <td className="px-3 py-2.5 font-semibold text-white">{c.name}</td>
                        <td className="px-3 py-2.5 text-zinc-300">{c.email} · {c.phone}</td>
                        <td className="px-3 py-2.5 font-mono text-zinc-200">{c.order_count} orders · {formatPrice(c.total_spent)}</td>
                        <td className="px-3 py-2.5 uppercase font-semibold text-[#E4C76B]">{c.status}</td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              const next = c.status === 'active' ? 'suspended' : 'active';
                              await fetch(`/api/admin/customers/${c.id}/status`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                                body: JSON.stringify({ status: next }),
                              });
                              await loadAllAdminData();
                            }}
                            className="px-3 py-1 border border-zinc-700 text-zinc-200 hover:border-[#C9A227] hover:text-white transition-colors"
                          >
                            {c.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. SHIPPING & COURIERS */}
          {tab === 'shipping' && (
            <div className="space-y-6 text-xs">
              <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
                <h2 className="font-display text-2xl font-semibold text-white">Shipping Zones</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {shippingData.zones.map((z) => (
                    <div key={z.id} className="border border-zinc-800 bg-zinc-950 p-3 space-y-1">
                      <div className="flex justify-between font-semibold text-white">
                        <span>{z.name}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/shipping-zones/${z.id}`, {
                              method: 'DELETE',
                              headers: { Authorization: `Bearer ${adminToken}` },
                            });
                            await loadAllAdminData();
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-zinc-300">{z.country} · {z.district} · {z.area}</p>
                      <p className="font-mono text-[#E4C76B]">Fee: {formatPrice(z.base_fee)} · Free &gt; {formatPrice(z.free_shipping_threshold)}</p>
                      <p className="text-zinc-400">{z.estimated_days}</p>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await fetch('/api/admin/shipping-zones', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                      body: JSON.stringify(newZone),
                    });
                    await loadAllAdminData();
                    showToast('Shipping zone added', 'success');
                  }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-zinc-800"
                >
                  <input type="text" required placeholder="Zone Name" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 focus:border-[#C9A227] focus:outline-none" />
                  <input type="text" required placeholder="Country" value={newZone.country} onChange={(e) => setNewZone({ ...newZone, country: e.target.value })} className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 focus:border-[#C9A227] focus:outline-none" />
                  <input type="text" placeholder="District" value={newZone.district} onChange={(e) => setNewZone({ ...newZone, district: e.target.value })} className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 focus:border-[#C9A227] focus:outline-none" />
                  <input type="number" step="0.01" placeholder="Fee USD" value={newZone.base_fee} onChange={(e) => setNewZone({ ...newZone, base_fee: Number(e.target.value) })} className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 focus:border-[#C9A227] focus:outline-none" />
                  <input type="text" placeholder="Estimated Days" value={newZone.estimated_days} onChange={(e) => setNewZone({ ...newZone, estimated_days: e.target.value })} className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 focus:border-[#C9A227] focus:outline-none" />
                  <button type="submit" className="px-4 py-1.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold">Add Zone</button>
                </form>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
                <h2 className="font-display text-2xl font-semibold text-white">Courier Services</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {shippingData.couriers.map((c) => (
                    <div key={c.id} className="border border-zinc-800 bg-zinc-950 p-3 space-y-1">
                      <p className="font-semibold text-white">{c.name}</p>
                      <p className="text-zinc-300">{c.supported_regions} · Base {formatPrice(c.base_rate)}</p>
                      <p className="font-mono text-[11px] text-zinc-400 truncate">{c.tracking_url_template}</p>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await fetch('/api/admin/couriers', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                      body: JSON.stringify(newCourier),
                    });
                    await loadAllAdminData();
                    showToast('Courier added', 'success');
                  }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-zinc-800"
                >
                  <input type="text" required placeholder="Courier Name" value={newCourier.name} onChange={(e) => setNewCourier({ ...newCourier, name: e.target.value })} className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 focus:border-[#C9A227] focus:outline-none" />
                  <input type="text" placeholder="Regions" value={newCourier.supported_regions} onChange={(e) => setNewCourier({ ...newCourier, supported_regions: e.target.value })} className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 focus:border-[#C9A227] focus:outline-none" />
                  <input type="text" placeholder="Tracking URL Template" value={newCourier.tracking_url_template} onChange={(e) => setNewCourier({ ...newCourier, tracking_url_template: e.target.value })} className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 focus:border-[#C9A227] focus:outline-none" />
                  <button type="submit" className="px-4 py-1.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold">Add Courier</button>
                </form>
              </div>
            </div>
          )}

          {/* 8. PAYMENTS */}
          {tab === 'payments' && (
            <div className="space-y-6 text-xs">
              <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
                <h2 className="font-display text-2xl font-semibold text-white">Payment Gateways (bKash, Nagad, COD, International)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentData.settings.map((gw) => (
                    <div key={gw.gateway} className="border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-white">{gw.display_name}</span>
                        <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                          {gw.env_configured
                            ? 'Server API Active'
                            : gw.merchant_number
                            ? `Send Money Active (${gw.merchant_number})`
                            : 'TrxID Verification Active'}
                        </span>
                      </div>
                      <div className="flex gap-4 text-zinc-200">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={gw.is_enabled}
                            onChange={(e) =>
                              setPaymentData((prev) => ({
                                ...prev,
                                settings: prev.settings.map((s) =>
                                  s.gateway === gw.gateway ? { ...s, is_enabled: e.target.checked } : s
                                ),
                              }))
                            }
                            className="accent-[#C9A227]"
                          />
                          <span>Enabled</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={gw.sandbox_mode}
                            onChange={(e) =>
                              setPaymentData((prev) => ({
                                ...prev,
                                settings: prev.settings.map((s) =>
                                  s.gateway === gw.gateway ? { ...s, sandbox_mode: e.target.checked } : s
                                ),
                              }))
                            }
                            className="accent-[#C9A227]"
                          />
                          <span>Sandbox Mode</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="Merchant Wallet Number (optional)"
                        value={gw.merchant_number}
                        onChange={(e) =>
                          setPaymentData((prev) => ({
                            ...prev,
                            settings: prev.settings.map((s) =>
                              s.gateway === gw.gateway ? { ...s, merchant_number: e.target.value } : s
                            ),
                          }))
                        }
                        className="w-full border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-2 py-1.5 font-mono focus:border-[#C9A227] focus:outline-none"
                      />
                      <textarea
                        rows={2}
                        value={gw.instructions}
                        onChange={(e) =>
                          setPaymentData((prev) => ({
                            ...prev,
                            settings: prev.settings.map((s) =>
                              s.gateway === gw.gateway ? { ...s, instructions: e.target.value } : s
                            ),
                          }))
                        }
                        className="w-full border border-zinc-700 bg-zinc-900 text-white px-2 py-1.5 focus:border-[#C9A227] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/payments/${gw.gateway}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                            body: JSON.stringify(gw),
                          });
                          await refreshStore();
                          showToast(`${gw.display_name} saved`, 'success');
                        }}
                        className="px-4 py-1.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold transition-colors"
                      >
                        Save Gateway Settings
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-3">
                <h3 className="text-sm font-semibold text-white">Payment & Verification Records</h3>
                <div className="overflow-x-auto border border-zinc-800">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-950 text-[#E4C76B] border-b border-zinc-800">
                      <tr>
                        <th className="px-3 py-2">Order</th>
                        <th className="px-3 py-2">Gateway</th>
                        <th className="px-3 py-2">Transaction ID</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {paymentData.records.map((r: any) => (
                        <tr key={r.id}>
                          <td className="px-3 py-2 font-mono text-white">{r.order_number}</td>
                          <td className="px-3 py-2 uppercase text-zinc-300">{r.gateway}</td>
                          <td className="px-3 py-2 font-mono text-zinc-300">{r.transaction_id || 'COD'}</td>
                          <td className="px-3 py-2 font-mono text-white">{formatPrice(r.amount)}</td>
                          <td className="px-3 py-2 uppercase font-semibold text-[#E4C76B]">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 9. COUPONS */}
          {tab === 'coupons' && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-6 text-xs">
              <h2 className="font-display text-2xl font-semibold text-white">Coupons & Promotional Campaigns</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch('/api/admin/coupons', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                    body: JSON.stringify(newCoupon),
                  });
                  if (res.ok) {
                    setNewCoupon({ code: '', discount_type: 'percentage', discount_value: 10, min_order_value: 0, max_uses: 100, expires_at: '', campaign_name: '' });
                    await loadAllAdminData();
                    showToast('Coupon created', 'success');
                  }
                }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              >
                <input type="text" required placeholder="Code (e.g. NEXA10)" value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })} className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-3 py-2 font-mono uppercase focus:border-[#C9A227] focus:outline-none" />
                <select value={newCoupon.discount_type} onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value })} className="border border-zinc-700 bg-zinc-950 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none">
                  <option value="percentage" className="bg-zinc-950 text-white">Percentage (%)</option>
                  <option value="fixed" className="bg-zinc-950 text-white">Fixed Amount ($)</option>
                </select>
                <input type="number" required placeholder="Value" value={newCoupon.discount_value} onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: Number(e.target.value) })} className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none" />
                <input type="number" placeholder="Min Order ($)" value={newCoupon.min_order_value} onChange={(e) => setNewCoupon({ ...newCoupon, min_order_value: Number(e.target.value) })} className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none" />
                <input type="number" placeholder="Max Uses" value={newCoupon.max_uses} onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: Number(e.target.value) })} className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none" />
                <input type="date" value={newCoupon.expires_at} onChange={(e) => setNewCoupon({ ...newCoupon, expires_at: e.target.value })} className="border border-zinc-700 bg-zinc-950 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
                <input type="text" placeholder="Campaign Name" value={newCoupon.campaign_name} onChange={(e) => setNewCoupon({ ...newCoupon, campaign_name: e.target.value })} className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
                <button type="submit" className="bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold px-4 py-2 transition-colors">Create Coupon</button>
              </form>

              <div className="space-y-2">
                {coupons.map((cp) => (
                  <div key={cp.id} className="border border-zinc-800 bg-zinc-950 p-3 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-semibold text-sm text-[#E4C76B]">{cp.code}</span>
                      <span className="ml-3 text-zinc-300">
                        {cp.discount_type === 'percentage' ? `${cp.discount_value}% off` : `$${cp.discount_value} off`} · Min ${cp.min_order_value} · Used {cp.used_count}/{cp.max_uses}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/coupons/${cp.id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${adminToken}` },
                        });
                        await loadAllAdminData();
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10. REVIEWS */}
          {tab === 'reviews' && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 text-xs">
              <h2 className="font-display text-2xl font-semibold text-white">Reviews & Customer Questions ({reviews.length})</h2>
              {reviews.length === 0 ? (
                <p className="text-zinc-400">No customer reviews or questions submitted yet.</p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-white">{r.author_name} on {r.product_name}</span>
                      <span className="uppercase font-mono text-[#E4C76B]">{r.status}</span>
                    </div>
                    <p className="text-zinc-200">{r.comment || r.question}</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/reviews/${r.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                            body: JSON.stringify({ status: 'approved' }),
                          });
                          await loadAllAdminData();
                        }}
                        className="px-3 py-1 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/reviews/${r.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                            body: JSON.stringify({ status: 'rejected' }),
                          });
                          await loadAllAdminData();
                        }}
                        className="px-3 py-1 border border-zinc-700 text-zinc-200 hover:border-red-400 hover:text-red-300"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 11. OFFICIAL SOCIAL MEDIA & TELEGRAM LINKS */}
          {tab === 'social' && siteForm && (
            <div className="space-y-6 text-xs">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                    body: JSON.stringify(siteForm),
                  });
                  if (res.ok) {
                    await refreshStore();
                    showToast('Official social media & Telegram links saved', 'success');
                  } else {
                    showToast('Failed to save social links', 'error');
                  }
                }}
                className="bg-zinc-900 border border-zinc-800 p-6 space-y-6"
              >
                <div>
                  <h2 className="font-display text-2xl font-semibold text-white">Official Social Media & Telegram Links</h2>
                  <p className="text-zinc-300 mt-1">
                    Update all five official SHOPNEXA ROBI HUB social and customer support URLs shown in the website footer, homepage, and floating support widget.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-zinc-200 mb-1">1. Facebook Page URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        required
                        value={siteForm.facebook_url}
                        onChange={(e) => setSiteForm({ ...siteForm, facebook_url: e.target.value })}
                        className="flex-1 border border-zinc-700 bg-zinc-950 text-white px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none"
                      />
                      <a
                        href={siteForm.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 border border-zinc-700 text-zinc-200 hover:border-[#C9A227] hover:text-white font-semibold"
                      >
                        Test
                      </a>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-200 mb-1">2. YouTube Channel URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        required
                        value={siteForm.youtube_url}
                        onChange={(e) => setSiteForm({ ...siteForm, youtube_url: e.target.value })}
                        className="flex-1 border border-zinc-700 bg-zinc-950 text-white px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none"
                      />
                      <a
                        href={siteForm.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 border border-zinc-700 text-zinc-200 hover:border-[#C9A227] hover:text-white font-semibold"
                      >
                        Test
                      </a>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-200 mb-1">3. Telegram Channel URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        required
                        value={siteForm.telegram_channel_url}
                        onChange={(e) => setSiteForm({ ...siteForm, telegram_channel_url: e.target.value })}
                        className="flex-1 border border-zinc-700 bg-zinc-950 text-white px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none"
                      />
                      <a
                        href={siteForm.telegram_channel_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 border border-zinc-700 text-zinc-200 hover:border-[#C9A227] hover:text-white font-semibold"
                      >
                        Test
                      </a>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-200 mb-1">4. Instagram Profile URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        required
                        value={siteForm.instagram_url}
                        onChange={(e) => setSiteForm({ ...siteForm, instagram_url: e.target.value })}
                        className="flex-1 border border-zinc-700 bg-zinc-950 text-white px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none"
                      />
                      <a
                        href={siteForm.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 border border-zinc-700 text-zinc-200 hover:border-[#C9A227] hover:text-white font-semibold"
                      >
                        Test
                      </a>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-200 mb-1">5. Telegram Customer Support URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        required
                        value={siteForm.telegram_support_url}
                        onChange={(e) => setSiteForm({ ...siteForm, telegram_support_url: e.target.value })}
                        className="flex-1 border border-zinc-700 bg-zinc-950 text-white px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none"
                      />
                      <a
                        href={siteForm.telegram_support_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 border border-zinc-700 text-zinc-200 hover:border-[#C9A227] hover:text-white font-semibold"
                      >
                        Test
                      </a>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-200 mb-1">Telegram Support Handle</label>
                    <input
                      type="text"
                      value={siteForm.telegram_support_username}
                      onChange={(e) => setSiteForm({ ...siteForm, telegram_support_username: e.target.value })}
                      className="w-full border border-zinc-700 bg-zinc-950 text-white px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-200 mb-1">Floating Telegram Support Instructions</label>
                  <textarea
                    rows={2}
                    value={siteForm.telegram_support_instructions}
                    onChange={(e) => setSiteForm({ ...siteForm, telegram_support_instructions: e.target.value })}
                    className="w-full border border-zinc-700 bg-zinc-950 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none"
                  />
                </div>

                <div className="border-t border-zinc-800 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Telegram Bot Server Alerts</h3>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {settings?.telegram_configured ? 'Bot Alerts Active' : 'Telegram Channel & Support Active'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-zinc-200">
                    {(
                      [
                        ['new_order', 'New Order Alerts'],
                        ['new_customer', 'New Customer Alerts'],
                        ['payment', 'Payment Notifications'],
                        ['low_stock', 'Low Stock Alerts'],
                        ['order_status', 'Order Status Updates'],
                        ['support', 'Support Alerts'],
                      ] as const
                    ).map(([k, label]) => (
                      <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={siteForm.telegram_alerts[k]}
                          onChange={(e) =>
                            setSiteForm({
                              ...siteForm,
                              telegram_alerts: { ...siteForm.telegram_alerts, [k]: e.target.checked },
                            })
                          }
                          className="accent-[#C9A227]"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch('/api/admin/telegram/test', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${adminToken}` },
                      });
                      const d = await res.json();
                      showToast(res.ok && d.sent ? 'Test alert sent to Telegram' : d.error || 'Telegram not configured', res.ok ? 'success' : 'error');
                    }}
                    className="px-3 py-1.5 border border-zinc-700 text-zinc-200 hover:border-[#C9A227] hover:text-white inline-flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Test Telegram Alert</span>
                  </button>
                </div>

                <button type="submit" className="px-6 py-2.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold">
                  Save Social & Telegram Links
                </button>
              </form>
            </div>
          )}

          {/* 12. WEBSITE, CREDENTIALS & BACKUP SETTINGS */}
          {tab === 'settings' && siteForm && (
            <div className="space-y-6 text-xs">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                    body: JSON.stringify(siteForm),
                  });
                  if (res.ok) {
                    await refreshStore();
                    showToast('Website & location settings saved', 'success');
                  }
                }}
                className="bg-zinc-900 border border-zinc-800 p-6 space-y-6"
              >
                <h2 className="font-display text-2xl font-semibold text-white">Website & Business Location Settings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-zinc-300 mb-1">Brand Name</label>
                    <input type="text" value={siteForm.brand_name} onChange={(e) => setSiteForm({ ...siteForm, brand_name: e.target.value })} className="w-full border border-zinc-700 bg-zinc-950 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-300 mb-1">Main Headline / Tagline</label>
                    <input type="text" value={siteForm.tagline} onChange={(e) => setSiteForm({ ...siteForm, tagline: e.target.value })} className="w-full border border-zinc-700 bg-zinc-950 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-300 mb-1">Logo Slogan</label>
                    <input type="text" value={siteForm.logo_slogan || 'SHOP • DISCOVER • ENJOY'} onChange={(e) => setSiteForm({ ...siteForm, logo_slogan: e.target.value })} className="w-full border border-zinc-700 bg-zinc-950 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-300 mb-1">Hero Title</label>
                    <input type="text" value={siteForm.hero_title} onChange={(e) => setSiteForm({ ...siteForm, hero_title: e.target.value })} className="w-full border border-zinc-700 bg-zinc-950 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-300 mb-1">Promo Banner Text</label>
                    <input type="text" value={siteForm.promo_banner_text} onChange={(e) => setSiteForm({ ...siteForm, promo_banner_text: e.target.value })} className="w-full border border-zinc-700 bg-zinc-950 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-300 mb-1">Contact Email</label>
                    <input type="email" value={siteForm.contact_email} onChange={(e) => setSiteForm({ ...siteForm, contact_email: e.target.value })} className="w-full border border-zinc-700 bg-zinc-950 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-300 mb-1">Business Location / Address</label>
                    <input type="text" value={siteForm.business_address} onChange={(e) => setSiteForm({ ...siteForm, business_address: e.target.value })} className="w-full border border-zinc-700 bg-zinc-950 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-300 mb-1">Customer App Download Visibility</label>
                    <select
                      value={siteForm.customer_download_buyers_only === false ? 'public' : 'buyers_only'}
                      onChange={(e) =>
                        setSiteForm({
                          ...siteForm,
                          customer_download_buyers_only: e.target.value !== 'public',
                        })
                      }
                      className="w-full border border-zinc-700 px-3 py-2 bg-zinc-950 text-white focus:border-[#C9A227] focus:outline-none"
                    >
                      <option value="buyers_only" className="bg-zinc-950 text-white">Buyers Only (Visible only after product purchase)</option>
                      <option value="public" className="bg-zinc-950 text-white">Public (Visible to all storefront visitors)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-zinc-300 mb-1">Android APK Download URL (Optional)</label>
                    <input
                      type="text"
                      value={siteForm.android_apk_url || ''}
                      onChange={(e) => setSiteForm({ ...siteForm, android_apk_url: e.target.value })}
                      placeholder="https://... or /shopnexa-robi-hub.apk (leave blank to use Chrome PWA / WebAPK install)"
                      className="w-full border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none"
                    />
                  </div>
                </div>

                <button type="submit" className="px-6 py-2.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold transition-colors">
                  Save Website Settings
                </button>
              </form>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setCredBusy(true);
                  try {
                    const res = await fetch('/api/admin/auth/credentials', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                      body: JSON.stringify(credForm),
                    });
                    const d = await res.json();
                    if (!res.ok) {
                      showToast(d.error || 'Failed to update admin credentials', 'error');
                    } else {
                      setCredForm({ currentPasscode: '', newUsername: '', newPasscode: '', newGmail: '' });
                      showToast('Administrator credentials updated', 'success');
                    }
                  } finally {
                    setCredBusy(false);
                  }
                }}
                className="bg-zinc-900 border border-zinc-800 p-6 space-y-4"
              >
                <h3 className="text-sm font-semibold text-white">Administrator Credentials & Hidden Verification Gmail</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-medium text-zinc-300 mb-1">Current Password *</label>
                    <input
                      type="password"
                      required
                      value={credForm.currentPasscode}
                      onChange={(e) => setCredForm({ ...credForm, currentPasscode: e.target.value })}
                      className="w-full border border-zinc-700 bg-zinc-950 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-300 mb-1">New Admin Name (Optional)</label>
                    <input
                      type="text"
                      value={credForm.newUsername}
                      onChange={(e) => setCredForm({ ...credForm, newUsername: e.target.value })}
                      placeholder="Leave blank to keep current"
                      className="w-full border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-300 mb-1">New Password (Optional, min 6)</label>
                    <input
                      type="password"
                      minLength={6}
                      value={credForm.newPasscode}
                      onChange={(e) => setCredForm({ ...credForm, newPasscode: e.target.value })}
                      placeholder="Leave blank to keep current"
                      className="w-full border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-300 mb-1">New Verification Gmail (Hidden)</label>
                    <input
                      type="password"
                      autoComplete="off"
                      value={credForm.newGmail}
                      onChange={(e) => setCredForm({ ...credForm, newGmail: e.target.value })}
                      placeholder="Leave blank to keep hidden Gmail"
                      className="w-full border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none"
                    />
                  </div>
                </div>
                <button type="submit" disabled={credBusy} className="px-5 py-2 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold transition-colors">
                  {credBusy ? 'Updating...' : 'Update Admin Credentials'}
                </button>
              </form>

              <div className="bg-black text-white border border-[#C9A227]/50 p-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src="/pwa-192x192.png"
                    alt="SHOPNEXA ROBI HUB App Icon"
                    className="w-14 h-14 rounded-2xl border border-[#C9A227]/80 shadow-lg shrink-0 object-cover"
                  />
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-[#E4C76B]">
                      INSTALLABLE MOBILE & DESKTOP APP
                    </p>
                    <h3 className="font-display text-xl font-semibold text-white mt-0.5">
                      SHOPNEXA ROBI HUB App
                    </h3>
                    <p className="text-zinc-300 mt-0.5">
                      Install SHOPNEXA ROBI HUB with its custom metallic gold app icon directly on your phone or desktop.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <PWAInstallButton variant="banner" label="Download SHOPNEXA ROBI HUB App" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Complete Website A-to-Z Archive & Database Backup</h3>
                  <p className="text-zinc-300 mt-0.5">
                    Download the complete SHOPNEXA ROBI HUB website package (all code, media, products, orders, settings & SQLite database) or the standalone database file.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    disabled={zipBusy}
                    onClick={() => void handleDownloadFullZip()}
                    className="px-4 py-2 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>{zipBusy ? 'Preparing A–Z ZIP...' : 'Download Full Website ZIP (A–Z)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownloadBackup()}
                    className="px-4 py-2 border border-zinc-700 text-zinc-100 hover:border-[#C9A227] hover:text-[#E4C76B] font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Database (.db)</span>
                  </button>
                </div>
              </div>

              {errorLogs.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-2">
                  <h3 className="text-sm font-semibold text-white">Recent Server Error Logs</h3>
                  {errorLogs.slice(0, 10).map((l: any) => (
                    <div key={l.id} className="font-mono text-[11px] text-red-400 border-b border-zinc-800 pb-1">
                      [{l.created_at}] {l.route}: {l.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {editingProduct.open && (
        <AdminProductEditor
          initialProduct={editingProduct.product}
          defaultType={editingProduct.defaultType}
          categories={categories}
          onClose={() => setEditingProduct({ open: false, product: null, defaultType: 'own' })}
          onSaved={async () => {
            await loadAllAdminData();
            await refreshStore();
          }}
        />
      )}
    </div>
  );
}
