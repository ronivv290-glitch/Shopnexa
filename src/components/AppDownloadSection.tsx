import React, { useState } from 'react';
import { Download, Smartphone, ArrowRight, ShieldCheck, Zap, CheckCircle2 } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

export function AppDownloadSection() {
  const { settings, navigate } = useStore();
  const { isInstallable, isInstalled, platform, install } = usePWAInstall();
  const [apkGuideOpen, setApkGuideOpen] = useState(false);

  const brandName = settings?.brand_name || 'SHOPNEXA ROBI HUB';
  const apkUrl = settings?.android_apk_url?.trim() || '';

  const handleAndroidAction = async () => {
    if (isInstallable && !isInstalled) {
      const ok = await install();
      if (ok) return;
    }
    setApkGuideOpen(true);
  };

  return (
    <section
      id="app-download-section"
      aria-labelledby="app-download-heading"
      className="relative bg-zinc-950 text-white border-y border-[#C9A227]/30 overflow-hidden"
    >
      {/* Subtle Architectural Radial Contrast */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,162,39,0.12),transparent_55%)]"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left Column: Copy, Highlights & Download Actions */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.22em] text-[#E4C76B]">
              MOBILE & DESKTOP APPLICATION
            </p>
            <h2
              id="app-download-heading"
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold leading-[1.08] text-balance text-white max-w-2xl"
            >
              Shop Faster With the {brandName} App
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-xl">
              Save {brandName} directly to your mobile home screen or desktop for instant one-tap access, smooth product customization, live order tracking, and offline-ready speed.
            </p>
          </div>

          {/* Clean Unboxed Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2 border-t border-zinc-800/90">
            <div className="pt-3 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#E4C76B]">
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>01. One-Tap Launch</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Opens full-screen right from your phone home screen.
              </p>
            </div>
            <div className="pt-3 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#E4C76B]">
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span>02. Android APK & PWA</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Supports Android WebAPK/APK, Safari iOS & desktop install.
              </p>
            </div>
            <div className="pt-3 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#E4C76B]">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>03. Live Order Access</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Instant wishlist sync, checkout & courier tracking.
              </p>
            </div>
          </div>

          {/* Primary Attractive CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            <PWAInstallButton
              variant="hero-cta"
              label={platform === 'ios' ? 'Save to Home Screen' : 'Download App'}
              alwaysVisible
            />

            {apkUrl ? (
              <a
                href={apkUrl}
                download="SHOPNEXA-ROBI-HUB.apk"
                className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-3 border border-[#C9A227]/70 hover:bg-[#C9A227] text-[#E4C76B] hover:text-black text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Download Android APK</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => void handleAndroidAction()}
                className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-3 border border-zinc-700 hover:border-[#C9A227] text-white hover:text-[#E4C76B] text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap shrink-0"
              >
                <Smartphone className="w-4 h-4 shrink-0 text-[#E4C76B]" />
                <span>Save to Home Screen Guide</span>
              </button>
            )}
          </div>

          {/* Subtle Quick Navigation & Platform Compatibility */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-900 text-xs text-zinc-400">
            <p className="font-medium text-zinc-400">
              Android Chrome (PWA / APK) <span aria-hidden="true" className="mx-1.5 text-zinc-600">·</span> iPhone Safari{' '}
              <span aria-hidden="true" className="mx-1.5 text-zinc-600">·</span> Desktop
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate({ page: 'shop', filter: 'discount' })}
                className="text-zinc-300 hover:text-[#E4C76B] font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <span>View Special Offers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'track' })}
                className="text-zinc-300 hover:text-[#E4C76B] font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <span>Track Existing Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Stylish Phone Showcase & App Icon Preview */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="w-full max-w-[330px] bg-zinc-900/90 border border-[#C9A227]/45 p-3 shadow-2xl">
            <div className="bg-[#09090B] border border-zinc-800 p-6 flex flex-col items-center text-center space-y-5">
              {/* Top Phone Bezel Accent */}
              <div className="w-16 h-1 bg-zinc-800 rounded-full" aria-hidden="true" />

              {/* Stylish App Icon Emblem */}
              <div className="relative pt-1">
                <img
                  src="/pwa-512x512.png"
                  alt={`${brandName} Mobile App Icon`}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 rounded-2xl border border-[#C9A227]/80 shadow-[0_12px_36px_rgba(201,162,39,0.22)] object-cover"
                />
              </div>

              <div className="space-y-1">
                <p className="font-display text-2xl font-semibold tracking-[0.08em] text-white">
                  {brandName}
                </p>
                <p className="text-[10px] font-semibold tracking-[0.22em] text-[#E4C76B]">
                  {settings?.logo_slogan || 'SHOP • DISCOVER • ENJOY'}
                </p>
                <p className="text-xs text-zinc-400 pt-1">
                  {settings?.tagline || 'THE FUTURE OF SHOPPING 🛍️'}
                </p>
              </div>

              {/* Clean Preview Metrics */}
              <div className="w-full grid grid-cols-3 border-y border-zinc-800/90 py-3 text-[11px] text-zinc-300">
                <div className="px-1">
                  <p className="font-semibold text-white">Direct</p>
                  <p className="text-zinc-500">Catalog</p>
                </div>
                <div className="px-1 border-x border-zinc-800">
                  <p className="font-semibold text-white">Instant</p>
                  <p className="text-zinc-500">Checkout</p>
                </div>
                <div className="px-1">
                  <p className="font-semibold text-white">Offline</p>
                  <p className="text-zinc-500">Ready</p>
                </div>
              </div>

              <div className="w-full">
                {apkUrl ? (
                  <a
                    href={apkUrl}
                    download="SHOPNEXA-ROBI-HUB.apk"
                    className="w-full min-h-[42px] px-4 py-2.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Get App (APK / PWA)</span>
                  </a>
                ) : (
                  <PWAInstallButton
                    variant="banner"
                    label={isInstalled ? 'App Installed' : 'Install on Home Screen'}
                    alwaysVisible
                    className="w-full"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Android / Mobile Home Screen Quick Guide Modal when secondary button is clicked */}
      {apkGuideOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="android-guide-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setApkGuideOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-zinc-950 text-white border border-[#C9A227]/50 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <img
                src="/pwa-192x192.png"
                alt={`${brandName} Icon`}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl border border-[#C9A227]/80 object-cover shrink-0"
              />
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-[#E4C76B]">
                  HOME SCREEN & MOBILE INSTALL
                </p>
                <h3 id="android-guide-title" className="font-display text-xl font-semibold text-white">
                  Install {brandName}
                </h3>
              </div>
            </div>

            {isInstalled ? (
              <p className="text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>The app is already saved and running on your device.</span>
              </p>
            ) : (
              <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                <p>
                  <strong className="text-white">Android (Chrome / Edge):</strong> Tap the browser menu <strong className="text-[#E4C76B]">⋮</strong> → <strong className="text-white">Add to Home screen</strong> → <strong className="text-[#E4C76B]">Install</strong>. Chrome installs it cleanly like a native app icon.
                </p>
                <p>
                  <strong className="text-white">iPhone / iPad (Safari):</strong> Tap <strong className="text-white">Share</strong> → <strong className="text-white">Add to Home Screen</strong> → <strong className="text-[#E4C76B]">Add</strong>.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              {isInstallable && !isInstalled && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await install();
                    if (ok) setApkGuideOpen(false);
                  }}
                  className="px-4 py-2 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold"
                >
                  Install Now
                </button>
              )}
              <button
                type="button"
                onClick={() => setApkGuideOpen(false)}
                className="px-4 py-2 border border-zinc-700 hover:border-white text-xs font-semibold text-zinc-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
