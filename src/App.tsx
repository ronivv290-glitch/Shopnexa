import React, { useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { Header } from './components/Header.tsx';
import { HomeView } from './components/HomeView.tsx';
import { ShopCatalogView } from './components/ShopCatalogView.tsx';
import { ProductDetailView } from './components/ProductDetailView.tsx';
import { CheckoutView } from './components/CheckoutView.tsx';
import { CustomerAccountView } from './components/CustomerAccountView.tsx';
import { OrderTrackingView } from './components/OrderTrackingView.tsx';
import { PolicyView } from './components/PolicyView.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { FloatingTelegramSupport } from './components/FloatingTelegramSupport.tsx';
import { Footer } from './components/Footer.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';

function StorefrontShell() {
  const { loading, route, settings, language, toast, isBuyerAppMode } = useStore();

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (settings?.seo_title) {
      document.title = settings.seo_title;
    }
  }, [settings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-3">
        <span className="font-display text-4xl font-semibold tracking-[0.2em] text-[#E4C76B]">
          SHOPNEXA
        </span>
        <p className="text-xs tracking-[0.25em] text-zinc-400">THE FUTURE OF SHOPPING</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-950">
      <Header />

      <main className="flex-1">
        {route.page === 'home' && <HomeView initialSection={route.section} />}
        {route.page === 'shop' && (
          <ShopCatalogView
            initialFilter={route.filter}
            initialCategoryId={route.categoryId}
            initialSearch={route.search}
          />
        )}
        {route.page === 'product' && <ProductDetailView productId={route.productId} />}
        {route.page === 'checkout' && <CheckoutView />}
        {route.page === 'account' && <CustomerAccountView initialTab={route.tab} />}
        {route.page === 'track' && <OrderTrackingView initialOrderNumber={route.orderNumber} />}
        {route.page === 'policy' && <PolicyView policyKey={route.policyKey} />}
        {route.page === 'admin' && (isBuyerAppMode ? <HomeView /> : <AdminDashboard />)}
      </main>

      <Footer />
      <CartDrawer />
      <FloatingTelegramSupport />
      <OfflineIndicator />

      {toast && (
        <div
          role="status"
          className={`fixed bottom-20 right-5 z-50 px-4 py-3 text-xs font-semibold shadow-xl border ${
            toast.type === 'error'
              ? 'bg-red-950 text-red-100 border-red-700'
              : toast.type === 'success'
              ? 'bg-zinc-950 text-[#E4C76B] border-[#C9A227]'
              : 'bg-zinc-900 text-white border-zinc-700'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <StorefrontShell />
    </StoreProvider>
  );
}
