import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  Category,
  Product,
  SiteSettings,
  PaymentSetting,
  ShippingZone,
  Review,
  User,
  CartItem,
  NotificationItem,
  Order,
} from '../types.ts';
import type { LanguageCode } from '../i18n.ts';
import { formatCurrency } from '../i18n.ts';

export type ActiveRoute =
  | { page: 'home'; section?: string }
  | { page: 'shop'; filter?: string; categoryId?: number; search?: string }
  | { page: 'product'; productId: number }
  | { page: 'checkout' }
  | { page: 'account'; tab?: string }
  | { page: 'track'; orderNumber?: string }
  | { page: 'admin' }
  | { page: 'policy'; policyKey: string };

interface StoreContextValue {
  loading: boolean;
  settings: SiteSettings | null;
  categories: Category[];
  products: Product[];
  paymentSettings: PaymentSetting[];
  shippingZones: ShippingZone[];
  reviews: Review[];
  exchangeRates: Record<string, number>;
  currency: string;
  setCurrency: (c: string) => void;
  language: LanguageCode;
  setLanguage: (l: LanguageCode) => void;
  formatPrice: (usdAmount: number) => string;

  route: ActiveRoute;
  navigate: (next: ActiveRoute) => void;

  // Auth tokens kept strictly in JS memory
  authToken: string | null;
  adminToken: string | null;
  user: User | null;
  setCustomerSession: (token: string, user: User) => void;
  setAdminSession: (token: string) => void;
  logoutCustomer: () => void;
  logoutAdmin: () => void;

  cart: CartItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (
    product: Product,
    opts?: { colorId?: number | null; sizeId?: number | null; variationId?: number | null; quantity?: number }
  ) => { ok: boolean; error?: string };
  updateCartQuantity: (cartItemId: number, quantity: number) => void;
  removeFromCart: (cartItemId: number) => void;
  clearCart: () => void;

  wishlistIds: number[];
  toggleWishlist: (productId: number) => Promise<void>;

  notifications: NotificationItem[];
  refreshNotifications: () => Promise<void>;

  lastCompletedOrder: Order | null;
  setLastCompletedOrder: (order: Order | null) => void;
  hasPurchasedProduct: boolean;
  markBuyerVerified: () => void;
  canShowCustomerDownload: boolean;
  isBuyerAppMode: boolean;

  refreshStore: () => Promise<void>;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSetting[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    USD: 1,
    BDT: 119.5,
    EUR: 0.92,
    GBP: 0.79,
    AED: 3.67,
    SGD: 1.34,
    CAD: 1.39,
    AUD: 1.52,
    INR: 84.4,
  });

  const [currency, setCurrency] = useState<string>('USD');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [route, setRoute] = useState<ActiveRoute>({ page: 'home' });

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [lastCompletedOrder, setLastCompletedOrderState] = useState<Order | null>(null);
  const [hasPurchasedProduct, setHasPurchasedProduct] = useState<boolean>(() => {
    try {
      return localStorage.getItem('shopnexa_buyer_verified') === '1';
    } catch {
      return false;
    }
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const isBuyerAppMode =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('buyer_app') === '1' ||
      Boolean(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));

  const markBuyerVerified = useCallback(() => {
    setHasPurchasedProduct(true);
    try {
      localStorage.setItem('shopnexa_buyer_verified', '1');
    } catch {
      // ignore storage failure
    }
  }, []);

  const setLastCompletedOrder = useCallback(
    (order: Order | null) => {
      setLastCompletedOrderState(order);
      if (order) {
        markBuyerVerified();
      }
    },
    [markBuyerVerified]
  );

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  }, []);

  const navigate = useCallback(
    (next: ActiveRoute) => {
      if (isBuyerAppMode && next.page === 'admin') {
        setRoute({ page: 'home' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setRoute(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [isBuyerAppMode]
  );

  const refreshStore = useCallback(async () => {
    try {
      const [bootRes, ratesRes] = await Promise.all([
        fetch('/api/store/bootstrap'),
        fetch('/api/exchange-rates'),
      ]);
      if (bootRes.ok) {
        const data = await bootRes.json();
        setSettings(data.settings);
        setCategories(data.categories);
        setProducts(data.products);
        setPaymentSettings(data.paymentSettings);
        setShippingZones(data.shippingZones);
        setReviews(data.reviews);
      }
      if (ratesRes.ok) {
        const rateData = await ratesRes.json();
        if (rateData.rates) setExchangeRates(rateData.rates);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStore();
  }, [refreshStore]);

  const refreshNotifications = useCallback(async () => {
    if (!authToken) {
      setNotifications([]);
      return;
    }
    const res = await fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      setNotifications(await res.json());
    }
  }, [authToken]);

  const syncCartToServer = useCallback(
    async (nextCart: CartItem[], tokenOverride?: string | null) => {
      const token = tokenOverride ?? authToken;
      if (!token) return;
      await fetch('/api/cart/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: nextCart.map((i) => ({
            product_id: i.product_id,
            color_id: i.color_id,
            size_id: i.size_id,
            variation_id: i.variation_id,
            quantity: i.quantity,
          })),
        }),
      });
    },
    [authToken]
  );

  const setCustomerSession = useCallback(
    (token: string, nextUser: User) => {
      setAuthToken(token);
      setUser(nextUser);
      void (async () => {
        const [wishRes, notifRes, ordersRes] = await Promise.all([
          fetch('/api/wishlist', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/orders/my', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (wishRes.ok) setWishlistIds(await wishRes.json());
        if (notifRes.ok) setNotifications(await notifRes.json());
        if (ordersRes.ok) {
          const myOrders = await ordersRes.json();
          if (Array.isArray(myOrders) && myOrders.length > 0) {
            markBuyerVerified();
          }
        }
        if (cart.length > 0) {
          await syncCartToServer(cart, token);
        }
      })();
    },
    [cart, markBuyerVerified, syncCartToServer]
  );

  const setAdminSession = useCallback((token: string) => {
    setAdminToken(token);
  }, []);

  const logoutCustomer = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    setWishlistIds([]);
    setNotifications([]);
    showToast('Signed out of customer account', 'info');
  }, [showToast]);

  const logoutAdmin = useCallback(() => {
    setAdminToken(null);
    showToast('Signed out of Admin Console', 'info');
  }, [showToast]);

  const addToCart = useCallback(
    (
      product: Product,
      opts?: { colorId?: number | null; sizeId?: number | null; variationId?: number | null; quantity?: number }
    ): { ok: boolean; error?: string } => {
      if (product.product_type !== 'own') {
        return { ok: false, error: 'Affiliate products are purchased directly via AliExpress.' };
      }

      const colorId = opts?.colorId ?? (product.colors[0]?.id ?? null);
      const sizeId = opts?.sizeId ?? (product.sizes[0]?.id ?? null);
      const variationId = opts?.variationId ?? null;
      const qty = Math.max(1, opts?.quantity ?? 1);

      const selectedColor = colorId ? product.colors.find((c) => c.id === colorId) || null : null;
      const selectedSize = sizeId ? product.sizes.find((s) => s.id === sizeId) || null : null;
      const selectedVar = variationId ? product.variations.find((v) => v.id === variationId) || null : null;

      const maxStock = selectedVar
        ? selectedVar.stock
        : selectedColor && selectedSize
        ? Math.min(selectedColor.stock, selectedSize.stock)
        : selectedColor
        ? selectedColor.stock
        : selectedSize
        ? selectedSize.stock
        : product.total_stock;

      if (maxStock <= 0) {
        showToast('This variation is currently out of stock.', 'error');
        return { ok: false, error: 'Out of stock' };
      }

      let updatedCart: CartItem[] = [];
      let blocked = false;

      setCart((prev) => {
        const existingIdx = prev.findIndex(
          (i) =>
            i.product_id === product.id &&
            i.color_id === colorId &&
            i.size_id === sizeId &&
            i.variation_id === variationId
        );
        if (existingIdx >= 0) {
          const nextQty = prev[existingIdx].quantity + qty;
          if (nextQty > maxStock) {
            blocked = true;
            return prev;
          }
          updatedCart = prev.map((item, idx) =>
            idx === existingIdx ? { ...item, quantity: nextQty } : item
          );
        } else {
          if (qty > maxStock) {
            blocked = true;
            return prev;
          }
          updatedCart = [
            ...prev,
            {
              id: Date.now() + Math.floor(Math.random() * 1000),
              product_id: product.id,
              color_id: colorId,
              size_id: sizeId,
              variation_id: variationId,
              quantity: qty,
              product,
              selected_color: selectedColor,
              selected_size: selectedSize,
              selected_variation: selectedVar,
            },
          ];
        }
        void syncCartToServer(updatedCart);
        return updatedCart;
      });

      if (blocked) {
        showToast(`Only ${maxStock} units available in stock for this selection.`, 'error');
        return { ok: false, error: 'Exceeds stock' };
      }

      showToast(`${product.name} added to bag`, 'success');
      setCartOpen(true);
      return { ok: true };
    },
    [showToast, syncCartToServer]
  );

  const updateCartQuantity = useCallback(
    (cartItemId: number, quantity: number) => {
      setCart((prev) => {
        const next = prev
          .map((item) => {
            if (item.id !== cartItemId) return item;
            const maxStock = item.selected_variation
              ? item.selected_variation.stock
              : item.selected_color && item.selected_size
              ? Math.min(item.selected_color.stock, item.selected_size.stock)
              : item.selected_color
              ? item.selected_color.stock
              : item.selected_size
              ? item.selected_size.stock
              : item.product.total_stock;
            const clamped = Math.min(Math.max(1, quantity), Math.max(1, maxStock));
            return { ...item, quantity: clamped };
          });
        void syncCartToServer(next);
        return next;
      });
    },
    [syncCartToServer]
  );

  const removeFromCart = useCallback(
    (cartItemId: number) => {
      setCart((prev) => {
        const next = prev.filter((i) => i.id !== cartItemId);
        void syncCartToServer(next);
        return next;
      });
    },
    [syncCartToServer]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    void syncCartToServer([]);
  }, [syncCartToServer]);

  const toggleWishlist = useCallback(
    async (productId: number) => {
      if (!authToken) {
        setWishlistIds((prev) =>
          prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
        );
        showToast('Saved to wishlist. Sign in to sync across sessions.', 'info');
        return;
      }
      const res = await fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        const data = await res.json();
        setWishlistIds((prev) =>
          data.wishlisted ? Array.from(new Set([...prev, productId])) : prev.filter((id) => id !== productId)
        );
        showToast(data.wishlisted ? 'Saved to wishlist' : 'Removed from wishlist', 'info');
      }
    },
    [authToken, showToast]
  );

  const formatPrice = useCallback(
    (usdAmount: number) => formatCurrency(usdAmount, currency, exchangeRates),
    [currency, exchangeRates]
  );

  const canShowCustomerDownload = Boolean(
    settings && (settings.customer_download_buyers_only === false || hasPurchasedProduct)
  );

  return (
    <StoreContext.Provider
      value={{
        loading,
        settings,
        categories,
        products,
        paymentSettings,
        shippingZones,
        reviews,
        exchangeRates,
        currency,
        setCurrency,
        language,
        setLanguage,
        formatPrice,
        route,
        navigate,
        authToken,
        adminToken,
        user,
        setCustomerSession,
        setAdminSession,
        logoutCustomer,
        logoutAdmin,
        cart,
        cartOpen,
        setCartOpen,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        wishlistIds,
        toggleWishlist,
        notifications,
        refreshNotifications,
        lastCompletedOrder,
        setLastCompletedOrder,
        hasPurchasedProduct,
        markBuyerVerified,
        canShowCustomerDownload,
        isBuyerAppMode,
        refreshStore,
        toast,
        showToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
