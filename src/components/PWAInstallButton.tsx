import React, { useState } from 'react';
import { Download, Smartphone, X, Share, MoreVertical } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'footer';
  label?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  label = 'Download App',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowGuide(true);
  };

  const buttonClass =
    variant === 'header'
      ? 'flex items-center gap-1.5 px-2.5 py-1.5 border border-[#C9A227]/60 hover:bg-[#C9A227] text-[#E4C76B] hover:text-black text-xs font-semibold transition-colors whitespace-nowrap shrink-0'
      : variant === 'banner'
      ? 'inline-flex items-center gap-2 px-5 py-3 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold transition-colors whitespace-nowrap'
      : 'inline-flex items-center gap-2 px-4 py-2 border border-[#C9A227] hover:bg-[#C9A227] text-[#E4C76B] hover:text-black text-xs font-semibold transition-colors';

  return (
    <>
      <button type="button" onClick={() => void handleClick()} className={buttonClass}>
        <Download className="w-3.5 h-3.5" />
        <span>{label}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-md bg-zinc-950 text-white border border-[#C9A227]/50 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-zinc-900 border border-[#C9A227] flex items-center justify-center text-[#E4C76B]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-[#E4C76B]">
                    SHOPNEXA APP
                  </p>
                  <h3 id="pwa-install-title" className="font-display text-xl font-semibold text-white">
                    Install SHOPNEXA on Your Device
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-xs text-zinc-300 leading-relaxed list-decimal pl-4">
                <li>
                  Tap the <strong className="text-white inline-flex items-center gap-1"><Share className="w-3.5 h-3.5 text-[#E4C76B]" /> Share</strong> button in Safari.
                </li>
                <li>
                  Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong className="text-[#E4C76B]">Add</strong> to install SHOPNEXA as a standalone app.
                </li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-xs text-zinc-300 leading-relaxed list-decimal pl-4">
                <li>
                  Open your browser menu (<MoreVertical className="w-3.5 h-3.5 inline text-[#E4C76B]" />) or look for the install icon in the address bar.
                </li>
                <li>
                  Tap <strong className="text-white">Install app</strong> or <strong className="text-white">Add to Home screen</strong>.
                </li>
                <li>
                  SHOPNEXA will install on your phone or desktop for fast one-tap shopping and offline browsing.
                </li>
              </ol>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {isInstallable && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await install();
                    if (ok) setShowGuide(false);
                  }}
                  className="px-4 py-2 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold"
                >
                  Install Now
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 border border-zinc-700 hover:border-white text-xs font-semibold text-zinc-200"
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
