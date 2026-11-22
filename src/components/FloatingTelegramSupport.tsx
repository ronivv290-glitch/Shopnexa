import React, { useState } from 'react';
import { Send, X, ExternalLink } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';

export function FloatingTelegramSupport() {
  const { settings } = useStore();
  const [open, setOpen] = useState(false);

  const supportUrl = settings?.telegram_support_url || 'https://t.me/ShoponexaMarketplaseSuport';
  const supportUser = settings?.telegram_support_username || '@ShoponexaMarketplaseSuport';
  const instructions =
    settings?.telegram_support_instructions ||
    'Message @ShoponexaMarketplaseSuport on Telegram with your Order ID or product inquiry for priority support.';

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="w-72 sm:w-80 bg-zinc-950 text-white border border-[#C9A227]/40 shadow-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-[#E4C76B]">SHOPNEXA Customer Support</p>
              <p className="text-xs font-mono text-zinc-300 mt-0.5">{supportUser}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close support card"
              className="text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">{instructions}</p>
          <a
            href={supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Open Telegram Support</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Telegram Customer Support"
          className="h-11 px-4 bg-zinc-950 hover:bg-zinc-900 text-white border border-[#C9A227] shadow-lg flex items-center gap-2 text-xs font-semibold transition-colors"
        >
          <Send className="w-4 h-4 text-[#E4C76B]" />
          <span>Telegram Support</span>
        </button>
      </div>
    </div>
  );
}
