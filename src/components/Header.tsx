import React, { useState } from 'react';
import {
  Search,
  User,
  Heart,
  ShoppingBag,
  ChevronDown,
  Menu,
  X,
  Globe,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { CURRENCIES, t, type LanguageCode } from '../i18n.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

export function Header() {
  const {
    settings,
    categories,
    currency,
    setCurrency,
    language,
    setLanguage,
    navigate,
    cart,
    setCartOpen,
    wishlistIds,
    user,
    adminToken,
    canShowCustomerDownload,
    isBuyerAppMode,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [openMenu, setOpenMenu] = useState<'home' | 'shop' | 'categories' | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const totalCartQty = cart.reduce((sum, i) => sum + i.quantity, 0);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ page: 'shop', search: searchTerm.trim(), filter: 'all' });
    setMobileOpen(false);
  };

  const homeItems = [
    { label: 'Homepage', action: () => navigate({ page: 'home' }) },
    { label: t(language, 'featuredProducts'), action: () => navigate({ page: 'home', section: 'featured' }) },
    { label: t(language, 'newArrivals'), action: () => navigate({ page: 'home', section: 'new-arrivals' }) },
    { label: t(language, 'trendingProducts'), action: () => navigate({ page: 'home', section: 'trending' }) },
    { label: t(language, 'bestSellers'), action: () => navigate({ page: 'home', section: 'best-sellers' }) },
    { label: t(language, 'specialOffers'), action: () => navigate({ page: 'home', section: 'special-offers' }) },
  ];

  const shopItems = [
    { label: t(language, 'allProducts'), action: () => navigate({ page: 'shop', filter: 'all' }) },
    { label: t(language, 'ownProducts'), action: () => navigate({ page: 'shop', filter: 'own' }) },
    { label: t(language, 'discountProducts'), action: () => navigate({ page: 'shop', filter: 'discount' }) },
    { label: t(language, 'newCollections'), action: () => navigate({ page: 'shop', filter: 'new' }) },
    { label: t(language, 'featuredCollections'), action: () => navigate({ page: 'shop', filter: 'featured' }) },
  ];

  return (
    <header className="sticky top-0 z-40 bg-zinc-950 text-white border-b border-[#C9A227]/25">
      {settings?.promo_banner_enabled && settings?.promo_banner_text?.trim() && (
        <div className="bg-black text-zinc-200 border-b border-zinc-800/80 px-4 py-1.5 text-xs">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
            <span className="truncate font-medium tracking-wide text-[#E4C76B]">
              {settings.promo_banner_text}
            </span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden p-2 text-zinc-300 hover:text-[#E4C76B]"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={() => navigate({ page: 'home' })}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
          >
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.brand_name || 'SHOPNEXA'}
                className="h-8 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="inline-flex items-center justify-center w-8 h-8 border border-[#C9A227] text-[#E4C76B] font-display font-bold text-lg">
                S
              </span>
            )}
            <div className="flex flex-col leading-none">
              <span className="font-display text-xl sm:text-2xl font-semibold tracking-[0.14em] text-white leading-none">
                {settings?.brand_name || 'SHOPNEXA'}
              </span>
              <span className="text-[9px] font-semibold tracking-[0.22em] text-[#E4C76B] mt-1">
                {settings?.logo_slogan || 'SHOP • DISCOVER • ENJOY'}
              </span>
            </div>
          </button>
        </div>

        {/* Exactly Three Main Navigation Menus */}
        <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold tracking-[0.12em]">
          {/* MENU 1: HOME */}
          <div
            className="relative"
            onMouseEnter={() => setOpenMenu('home')}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <button
              type="button"
              onClick={() => navigate({ page: 'home' })}
              className="flex items-center gap-1 py-5 text-zinc-200 hover:text-[#E4C76B] transition-colors whitespace-nowrap shrink-0"
            >
              <span>{t(language, 'menuHome')}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {openMenu === 'home' && (
              <div className="absolute left-0 top-full w-56 bg-zinc-950 border border-[#C9A227]/30 shadow-2xl py-2 z-50">
                {homeItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      item.action();
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium tracking-normal text-zinc-300 hover:bg-zinc-900 hover:text-[#E4C76B] transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* MENU 2: SHOP */}
          <div
            className="relative"
            onMouseEnter={() => setOpenMenu('shop')}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <button
              type="button"
              onClick={() => navigate({ page: 'shop', filter: 'all' })}
              className="flex items-center gap-1 py-5 text-zinc-200 hover:text-[#E4C76B] transition-colors whitespace-nowrap shrink-0"
            >
              <span>{t(language, 'menuShop')}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {openMenu === 'shop' && (
              <div className="absolute left-0 top-full w-56 bg-zinc-950 border border-[#C9A227]/30 shadow-2xl py-2 z-50">
                {shopItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      item.action();
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium tracking-normal text-zinc-300 hover:bg-zinc-900 hover:text-[#E4C76B] transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* MENU 3: CATEGORIES */}
          <div
            className="relative"
            onMouseEnter={() => setOpenMenu('categories')}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <button
              type="button"
              onClick={() => setOpenMenu((m) => (m === 'categories' ? null : 'categories'))}
              className="flex items-center gap-1 py-5 text-zinc-200 hover:text-[#E4C76B] transition-colors whitespace-nowrap shrink-0"
            >
              <span>{t(language, 'menuCategories')}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {openMenu === 'categories' && (
              <div className="absolute left-0 top-full w-[540px] bg-zinc-950 border border-[#C9A227]/30 shadow-2xl p-4 grid grid-cols-2 gap-1 z-50">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      navigate({ page: 'shop', categoryId: cat.id, filter: 'all' });
                      setOpenMenu(null);
                    }}
                    className="flex items-center justify-between px-3 py-2 text-xs font-medium tracking-normal text-zinc-300 hover:bg-zinc-900 hover:text-[#E4C76B] transition-colors text-left"
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className="text-[11px] font-mono tabular-nums text-zinc-500">
                      {cat.product_count ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-xs lg:max-w-sm relative">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t(language, 'searchPlaceholder')}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#C9A227] rounded-none pl-3 pr-9 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            aria-label="Search products"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#E4C76B]"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Actions: Currency, Language, Account, Wishlist, Cart */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center border border-zinc-800 bg-zinc-900 px-2 py-1">
            <select
              aria-label="Select Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-transparent text-xs font-mono text-zinc-200 focus:outline-none cursor-pointer"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-zinc-950 text-white">
                  {c.code}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:flex items-center gap-1 border border-zinc-800 bg-zinc-900 px-2 py-1">
            <Globe className="w-3.5 h-3.5 text-[#C9A227]" />
            <select
              aria-label="Select Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="en" className="bg-zinc-950">EN</option>
              <option value="bn" className="bg-zinc-950">বাংলা</option>
              <option value="ar" className="bg-zinc-950">AR</option>
              <option value="es" className="bg-zinc-950">ES</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => navigate({ page: 'track' })}
            className="hidden md:flex p-2 text-zinc-300 hover:text-[#E4C76B] transition-colors"
            aria-label={t(language, 'trackOrder')}
            title={t(language, 'trackOrder')}
          >
            <Truck className="w-4 h-4" />
          </button>

          {!isBuyerAppMode && (
            <button
              type="button"
              onClick={() => navigate({ page: 'admin' })}
              className="hidden md:flex p-2 text-zinc-300 hover:text-[#E4C76B] transition-colors"
              aria-label={adminToken ? 'Admin Active' : t(language, 'admin')}
              title={adminToken ? 'Admin Active' : t(language, 'admin')}
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate({ page: 'account', tab: 'profile' })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:text-[#E4C76B] transition-colors whitespace-nowrap"
            aria-label="Customer Account"
          >
            <User className="w-4 h-4" />
            <span className="hidden xl:inline">{user ? user.name.split(' ')[0] : t(language, 'account')}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate({ page: 'account', tab: 'wishlist' })}
            className="relative p-2 text-zinc-200 hover:text-[#E4C76B] transition-colors"
            aria-label="Wishlist"
          >
            <Heart className="w-4 h-4" />
            {wishlistIds.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#C9A227] text-black text-[10px] font-bold font-mono tabular-nums flex items-center justify-center">
                {wishlistIds.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">{t(language, 'cart')}</span>
            <span className="font-mono tabular-nums font-bold">({totalCartQty})</span>
          </button>

          {canShowCustomerDownload && (
            <div className="hidden md:block">
              <PWAInstallButton variant="header" label="Download App" />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-zinc-950 border-t border-zinc-800 px-4 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t(language, 'searchPlaceholder')}
              className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white"
            />
          </form>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white"
            >
              <option value="en">English</option>
              <option value="bn">বাংলা</option>
              <option value="ar">العربية</option>
              <option value="es">Español</option>
            </select>
          </div>

          <div className="space-y-3 border-t border-zinc-800 pt-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#C9A227] mb-1.5">{t(language, 'menuHome')}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {homeItems.map((i) => (
                  <button
                    key={i.label}
                    type="button"
                    onClick={() => {
                      i.action();
                      setMobileOpen(false);
                    }}
                    className="text-left text-xs text-zinc-300 py-1.5 hover:text-[#E4C76B]"
                  >
                    {i.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wider text-[#C9A227] mb-1.5">{t(language, 'menuShop')}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {shopItems.map((i) => (
                  <button
                    key={i.label}
                    type="button"
                    onClick={() => {
                      i.action();
                      setMobileOpen(false);
                    }}
                    className="text-left text-xs text-zinc-300 py-1.5 hover:text-[#E4C76B]"
                  >
                    {i.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wider text-[#C9A227] mb-1.5">{t(language, 'menuCategories')}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      navigate({ page: 'shop', categoryId: cat.id });
                      setMobileOpen(false);
                    }}
                    className="text-left text-xs text-zinc-300 py-1.5 hover:text-[#E4C76B] truncate"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  navigate({ page: 'track' });
                  setMobileOpen(false);
                }}
                className="text-xs font-medium text-[#E4C76B]"
              >
                {t(language, 'trackOrder')}
              </button>
              {!isBuyerAppMode && (
                <button
                  type="button"
                  onClick={() => {
                    navigate({ page: 'admin' });
                    setMobileOpen(false);
                  }}
                  className="text-xs font-medium text-zinc-300"
                >
                  {t(language, 'admin')}
                </button>
              )}
              {canShowCustomerDownload && <PWAInstallButton variant="header" label="Download App" />}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
