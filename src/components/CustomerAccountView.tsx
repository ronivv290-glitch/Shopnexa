import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  MapPin,
  Heart,
  Package,
  Bell,
  LogOut,
  Trash2,
  Check,
  Upload,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import type { CustomerAddress, Order } from '../types.ts';
import { ProductCard } from './ProductCard.tsx';

export function CustomerAccountView({ initialTab = 'profile' }: { initialTab?: string }) {
  const {
    user,
    authToken,
    setCustomerSession,
    logoutCustomer,
    products,
    wishlistIds,
    notifications,
    refreshNotifications,
    formatPrice,
    navigate,
    showToast,
  } = useStore();

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [newAddr, setNewAddr] = useState<Partial<CustomerAddress>>({
    label: 'Home',
    country: 'Bangladesh',
    division: 'Rangpur',
    district: 'Rangpur',
    area: '',
    postal_code: '',
    full_name: '',
    mobile: '',
    email: '',
    is_default: true,
  });

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!authToken || !user) return;
    setProfileName(user.name);
    setProfilePhone(user.phone);
    setProfileAvatar(user.avatar_url);

    fetch('/api/orders/my', { headers: { Authorization: `Bearer ${authToken}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setOrders)
      .catch(() => {});

    fetch('/api/addresses', { headers: { Authorization: `Bearer ${authToken}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setAddresses)
      .catch(() => {});

    void refreshNotifications();
  }, [authToken, user, refreshNotifications]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Login failed', 'error');
          return;
        }
        setCustomerSession(data.token, data.user);
        showToast(`Welcome back, ${data.user.name}`, 'success');
      } else if (authMode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Registration failed', 'error');
          return;
        }
        setCustomerSession(data.token, data.user);
        showToast('Account created and signed in', 'success');
      } else if (authMode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        showToast(
          data.resetCodePreview
            ? `Reset code generated: ${data.resetCodePreview}`
            : data.message,
          'info'
        );
        setAuthMode('reset');
      } else if (authMode === 'reset') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, resetCode, newPassword: password }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Reset failed', 'error');
          return;
        }
        showToast(data.message, 'success');
        setAuthMode('login');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authToken) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: fd,
    });
    if (res.ok) {
      const data = await res.json();
      setProfileAvatar(data.url);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: profileName, phone: profilePhone, avatar_url: profileAvatar }),
    });
    const data = await res.json();
    if (res.ok) {
      setCustomerSession(authToken, data.user);
      showToast('Profile updated', 'success');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Password updated', 'success');
      setCurrentPassword('');
      setNewPassword('');
    } else {
      showToast(data.error || 'Failed to update password', 'error');
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    const res = await fetch('/api/addresses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(newAddr),
    });
    if (res.ok) {
      const created = await res.json();
      setAddresses((prev) => [created, ...prev.map((a) => (created.is_default ? { ...a, is_default: false } : a))]);
      showToast('Address saved', 'success');
    }
  };

  const handleSetDefaultAddress = async (addr: CustomerAddress) => {
    if (!authToken || !addr.id) return;
    const res = await fetch(`/api/addresses/${addr.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ ...addr, is_default: true }),
    });
    if (res.ok) {
      setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === addr.id })));
      showToast('Default address updated', 'success');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!authToken) return;
    await fetch(`/api/addresses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));

  if (!user || !authToken) {
    return (
      <div className="max-w-lg mx-auto px-4 py-14 space-y-6">
        <div className="border border-zinc-200 p-8 bg-white space-y-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#9C7A16]">CUSTOMER PORTAL</p>
            <h1 className="font-display text-3xl font-semibold text-zinc-950 mt-1">
              {authMode === 'login' && 'Sign In to SHOPNEXA'}
              {authMode === 'register' && 'Create Customer Account'}
              {authMode === 'forgot' && 'Forgot Password'}
              {authMode === 'reset' && 'Reset Password'}
            </h1>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            {authMode === 'register' && (
              <>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-zinc-300 px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-zinc-300 px-3 py-2.5"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block font-medium text-zinc-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-zinc-300 px-3 py-2.5"
              />
            </div>

            {authMode === 'reset' && (
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Reset Code</label>
                <input
                  type="text"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full border border-zinc-300 px-3 py-2.5 font-mono"
                />
              </div>
            )}

            {authMode !== 'forgot' && (
              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  {authMode === 'reset' ? 'New Password' : 'Password'}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-zinc-300 px-3 py-2.5"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-zinc-950 hover:bg-[#C9A227] text-white hover:text-black font-semibold transition-colors"
            >
              {authLoading
                ? 'Processing...'
                : authMode === 'login'
                ? 'Sign In'
                : authMode === 'register'
                ? 'Create Account'
                : authMode === 'forgot'
                ? 'Request Reset Code'
                : 'Reset Password'}
            </button>
          </form>

          <div className="flex flex-wrap justify-between gap-2 pt-4 border-t border-zinc-200 text-xs">
            {authMode === 'login' ? (
              <>
                <button type="button" onClick={() => setAuthMode('register')} className="font-semibold text-zinc-950 hover:text-[#9C7A16]">
                  Create an account
                </button>
                <button type="button" onClick={() => setAuthMode('forgot')} className="text-zinc-600 hover:text-black">
                  Forgot password?
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setAuthMode('login')} className="font-semibold text-zinc-950 hover:text-[#9C7A16]">
                Back to Sign In
              </button>
            )}
          </div>
        </div>

        {wishlistProducts.length > 0 && (
          <div className="border border-zinc-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold">Saved Wishlist ({wishlistProducts.length})</h2>
            <div className="grid grid-cols-1 gap-4">
              {wishlistProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-zinc-950 text-[#E4C76B] flex items-center justify-center font-display text-2xl font-semibold overflow-hidden border border-[#C9A227]">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold text-zinc-950">{user.name}</h1>
            <p className="text-xs text-zinc-500">{user.email} · {user.phone || 'No phone set'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logoutCustomer}
          className="px-4 py-2 border border-zinc-300 hover:border-zinc-950 text-xs font-semibold flex items-center gap-2 self-start"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3 space-y-1">
          {[
            { id: 'profile', label: 'Profile & Security', icon: UserIcon },
            { id: 'orders', label: `Order History (${orders.length})`, icon: Package },
            { id: 'addresses', label: `Saved Addresses (${addresses.length})`, icon: MapPin },
            { id: 'wishlist', label: `Wishlist (${wishlistProducts.length})`, icon: Heart },
            { id: 'notifications', label: `Notifications (${notifications.filter((n) => !n.is_read).length})`, icon: Bell },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`w-full px-4 py-3 text-left text-xs font-semibold flex items-center gap-2.5 border transition-colors ${
                  tab === item.id
                    ? 'bg-zinc-950 text-white border-zinc-950'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-900'
                }`}
              >
                <Icon className="w-4 h-4 text-[#C9A227]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        <div className="lg:col-span-9">
          {tab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={handleSaveProfile} className="border border-zinc-200 p-6 space-y-4 text-xs">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Update Profile</h2>
                <div>
                  <label className="block font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full border border-zinc-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full border border-zinc-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Profile Picture</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={profileAvatar}
                      onChange={(e) => setProfileAvatar(e.target.value)}
                      placeholder="Image URL or upload"
                      className="flex-1 border border-zinc-300 px-3 py-2"
                    />
                    <label className="px-3 py-2 bg-zinc-100 border border-zinc-300 cursor-pointer flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={(e) => void handleAvatarUpload(e)} className="hidden" />
                    </label>
                  </div>
                </div>
                <button type="submit" className="px-5 py-2.5 bg-zinc-950 text-white font-semibold">
                  Save Profile
                </button>
              </form>

              <form onSubmit={handleChangePassword} className="border border-zinc-200 p-6 space-y-4 text-xs">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Change Password</h2>
                <div>
                  <label className="block font-medium mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full border border-zinc-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-zinc-300 px-3 py-2"
                  />
                </div>
                <button type="submit" className="px-5 py-2.5 bg-zinc-950 text-white font-semibold">
                  Update Password
                </button>
              </form>
            </div>
          )}

          {tab === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="border border-zinc-200 p-8 text-xs text-zinc-500">
                  You have not placed any direct orders yet.
                </div>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className="border border-zinc-200 p-5 space-y-3 text-xs bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                      <div>
                        <span className="font-mono font-semibold text-sm text-zinc-950">{o.order_number}</span>
                        <span className="text-zinc-500 ml-3">{o.created_at.slice(0, 10)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-[#9C7A16]">{o.order_status}</span>
                        <span className="font-mono font-semibold">{formatPrice(o.final_total)}</span>
                        <button
                          type="button"
                          onClick={() => navigate({ page: 'track', orderNumber: o.order_number })}
                          className="px-3 py-1 border border-zinc-300 hover:border-black font-semibold"
                        >
                          Track
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {o.items.map((it) => (
                        <p key={it.id} className="text-zinc-700">
                          {it.quantity} × {it.product_name} ({[it.color_name, it.size_label].filter(Boolean).join(', ')})
                        </p>
                      ))}
                    </div>
                    {o.tracking_number && (
                      <p className="text-zinc-600 font-mono">
                        Courier: {o.courier_name || 'Assigned'} · Tracking: {o.tracking_number}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'addresses' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div key={addr.id} className="border border-zinc-200 p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-950">
                        {addr.label} {addr.is_default && '· Default'}
                      </span>
                      <div className="flex items-center gap-2">
                        {!addr.is_default && (
                          <button
                            type="button"
                            onClick={() => void handleSetDefaultAddress(addr)}
                            className="text-[#9C7A16] hover:underline flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Set Default</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => addr.id && void handleDeleteAddress(addr.id)}
                          className="text-zinc-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="font-medium">{addr.full_name} · {addr.mobile}</p>
                    <p className="text-zinc-600">
                      {[addr.house_number, addr.road_number, addr.area, addr.district || addr.city, addr.country, addr.postal_code]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSaveAddress} className="border border-zinc-200 p-6 space-y-4 text-xs">
                <h3 className="text-sm font-semibold">Add New Address</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Label (Home / Office)"
                    value={newAddr.label || ''}
                    onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                    className="border border-zinc-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Recipient Full Name"
                    value={newAddr.full_name || ''}
                    onChange={(e) => setNewAddr({ ...newAddr, full_name: e.target.value })}
                    className="border border-zinc-300 px-3 py-2"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Mobile Number"
                    value={newAddr.mobile || ''}
                    onChange={(e) => setNewAddr({ ...newAddr, mobile: e.target.value })}
                    className="border border-zinc-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Country"
                    value={newAddr.country || ''}
                    onChange={(e) => setNewAddr({ ...newAddr, country: e.target.value })}
                    className="border border-zinc-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    required
                    placeholder="District / City"
                    value={newAddr.district || ''}
                    onChange={(e) => setNewAddr({ ...newAddr, district: e.target.value, city: e.target.value })}
                    className="border border-zinc-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Postal / ZIP Code"
                    value={newAddr.postal_code || ''}
                    onChange={(e) => setNewAddr({ ...newAddr, postal_code: e.target.value })}
                    className="border border-zinc-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Area / Street Address"
                    value={newAddr.area || ''}
                    onChange={(e) => setNewAddr({ ...newAddr, area: e.target.value, street_address: e.target.value })}
                    className="sm:col-span-3 border border-zinc-300 px-3 py-2"
                  />
                </div>
                <button type="submit" className="px-5 py-2.5 bg-zinc-950 text-white font-semibold">
                  Save Address
                </button>
              </form>
            </div>
          )}

          {tab === 'wishlist' && (
            <div>
              {wishlistProducts.length === 0 ? (
                <div className="border border-zinc-200 p-8 text-xs text-zinc-500">
                  Your wishlist is empty.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlistProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/notifications/read-all', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${authToken}` },
                    });
                    await refreshNotifications();
                  }}
                  className="text-xs font-semibold text-[#9C7A16] hover:underline"
                >
                  Mark all as read
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="border border-zinc-200 p-8 text-xs text-zinc-500">No notifications yet.</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`border p-4 text-xs ${
                      n.is_read ? 'border-zinc-200 bg-white' : 'border-[#C9A227] bg-zinc-50'
                    }`}
                  >
                    <div className="flex justify-between font-semibold text-zinc-950">
                      <span>{n.title}</span>
                      <span className="text-zinc-400 font-mono">{n.created_at.slice(0, 10)}</span>
                    </div>
                    <p className="text-zinc-600 mt-1">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
