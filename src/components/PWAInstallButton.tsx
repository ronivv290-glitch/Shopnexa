import React, { useState, useEffect } from 'react';
import { Download, X, Share, MoreVertical, Smartphone, Monitor, CheckCircle2, PlusSquare } from 'lucide-react';
import { usePWAInstall, type InstallPlatform } from '../hooks/usePWAInstall.ts';
import { useStore } from '../context/StoreContext.tsx';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'footer' | 'hero-cta';
  label?: string;
  shortMobileLabel?: string;
  defaultTab?: InstallPlatform;
  alwaysVisible?: boolean;
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  label = 'Download App',
  shortMobileLabel,
  defaultTab,
  alwaysVisible = false,
  className = '',
}) => {
  const { settings } = useStore();
  const { isInstallable, isInstalled, platform, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [activeTab, setActiveTab] = useState<InstallPlatform>(defaultTab || platform);

  useEffect(() => {
    setActiveTab(defaultTab || platform);
  }, [defaultTab, platform]);

  if (isInstalled && !alwaysVisible) {
    return null;
  }

  const apkUrl = settings?.android_apk_url?.trim() || '';

  const handleClick = async () => {
    if (isInstalled) {
      setShowGuide(true);
      return;
    }
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setActiveTab(defaultTab || platform);
    setShowGuide(true);
  };

  const buttonClass =
    variant === 'header'
      ? 'flex items-center gap-1.5 px-2 sm:px-3 py-1.5 border border-[#C9A227]/75 hover:bg-[#C9A227] text-[#E4C76B] hover:text-black text-xs font-semibold transition-colors whitespace-nowrap shrink-0'
      : variant === 'hero-cta'
      ? 'inline-flex items-center justify-center gap-2.5 min-h-[46px] px-7 py-3 bg-[#C9A227] hover:bg-[#E4C76B] active:scale-[0.99] text-black text-xs sm:text-sm font-semibold tracking-wide transition-all duration-200 whitespace-nowrap shrink-0 shadow-[0_8px_28px_rgba(201,162,39,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E4C76B]'
      : variant === 'banner'
      ? 'inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-3 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold transition-colors whitespace-nowrap shrink-0'
      : 'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 border border-[#C9A227] hover:bg-[#C9A227] text-[#E4C76B] hover:text-black text-xs font-semibold transition-colors whitespace-nowrap shrink-0';

  return (
    <>
      <button type="button" onClick={() => void handleClick()} className={`${buttonClass} ${className}`.trim()} aria-label={label}>
        {isInstalled ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Download className="w-3.5 h-3.5 shrink-0" />}
        {isInstalled ? (
          <span>App Installed</span>
        ) : shortMobileLabel ? (
          <>
            <span className="sm:hidden">{shortMobileLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </>
        ) : (
          <span>{label}</span>
        )}
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuide(false);
          }}
        >
          <div className="w-full max-w-lg bg-zinc-950 text-white border border-[#C9A227]/50 p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <img
                  src="/pwa-192x192.png"
                  alt="SHOPNEXA ROBI HUB App Icon"
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-2xl border border-[#C9A227]/80 shadow-lg shrink-0 object-cover"
                />
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-[#E4C76B]">
                    SHOPNEXA ROBI HUB APP
                  </p>
                  <h3 id="pwa-install-title" className="font-display text-2xl font-semibold text-white leading-tight">
                    Save to Home Screen
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Fast mobile shopping, offline support & instant launch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="p-1.5 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isInstalled && (
              <div className="border border-emerald-700/60 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>SHOPNEXA ROBI HUB is already installed on this device.</span>
              </div>
            )}

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 border border-zinc-800">
              {(
                [
                  { id: 'android', label: 'Android', icon: Smartphone },
                  { id: 'ios', label: 'iPhone / iPad', icon: Share },
                  { id: 'desktop', label: 'Desktop', icon: Monitor },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                      active ? 'bg-[#C9A227] text-black' : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {activeTab === 'android' && (
              <div className="space-y-4">
                <ol className="space-y-2.5 text-xs text-zinc-300 leading-relaxed list-decimal pl-4">
                  <li>
                    Open this page in <strong className="text-white">Google Chrome</strong> or <strong className="text-white">Microsoft Edge</strong> on Android.
                  </li>
                  <li>
                    Tap the browser menu (<MoreVertical className="w-3.5 h-3.5 inline text-[#E4C76B]" />) at the top right.
                  </li>
                  <li>
                    Select <strong className="text-white">Add to Home screen</strong> or <strong className="text-white">Install app</strong>, then confirm <strong className="text-[#E4C76B]">Install</strong>.
                  </li>
                </ol>

                {apkUrl ? (
                  <div className="border border-[#C9A227]/40 bg-zinc-900/70 p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs">
                      <p className="font-semibold text-[#E4C76B]">Android APK Package Available</p>
                      <p className="text-zinc-400 mt-0.5">Download the standalone Android installer directly.</p>
                    </div>
                    <a
                      href={apkUrl}
                      download="SHOPNEXA-ROBI-HUB.apk"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download APK</span>
                    </a>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-400 border-t border-zinc-800 pt-3">
                    Chrome automatically packages <strong className="text-zinc-200">SHOPNEXA ROBI HUB</strong> as a lightweight WebAPK right on your Android app drawer & home screen.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'ios' && (
              <ol className="space-y-2.5 text-xs text-zinc-300 leading-relaxed list-decimal pl-4">
                <li>
                  Open <strong className="text-white">SHOPNEXA ROBI HUB</strong> in <strong className="text-white">Safari</strong> on your iPhone or iPad.
                </li>
                <li>
                  Tap the <strong className="text-white inline-flex items-center gap-1"><Share className="w-3.5 h-3.5 text-[#E4C76B]" /> Share</strong> button on the Safari toolbar.
                </li>
                <li>
                  Scroll down and tap <strong className="text-white inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 text-[#E4C76B]" /> Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong className="text-[#E4C76B]">Add</strong> in the top-right corner to save the app icon.
                </li>
              </ol>
            )}

            {activeTab === 'desktop' && (
              <ol className="space-y-2.5 text-xs text-zinc-300 leading-relaxed list-decimal pl-4">
                <li>
                  Look for the <strong className="text-white">Install</strong> icon on the right side of your Chrome or Edge address bar.
                </li>
                <li>
                  Or open the browser menu (<MoreVertical className="w-3.5 h-3.5 inline text-[#E4C76B]" />) → <strong className="text-white">Cast, save, and share</strong> → <strong className="text-white">Install SHOPNEXA ROBI HUB</strong>.
                </li>
                <li>
                  The app launches in its own dedicated window with quick desktop shortcut access.
                </li>
              </ol>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
              {isInstallable && !isInstalled && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await install();
                    if (ok) setShowGuide(false);
                  }}
                  className="px-5 py-2.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install Now (One-Tap)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-2.5 border border-zinc-700 hover:border-white text-xs font-semibold text-zinc-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
