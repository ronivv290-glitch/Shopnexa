import React from 'react';
import { Facebook, Youtube, Send, Instagram, Mail, MapPin, Headphones } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

export function Footer() {
  const { settings, navigate, canShowCustomerDownload } = useStore();

  return (
    <footer className="bg-zinc-950 text-zinc-300 border-t border-[#C9A227]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* Brand */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-semibold tracking-[0.14em] text-white">
              {settings?.brand_name || 'SHOPNEXA ROBI HUB'}
            </h2>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#E4C76B]">
              {settings?.tagline || 'THE FUTURE OF SHOPPING 🛍️'}
            </p>
            <p className="text-[10px] font-medium tracking-[0.24em] text-zinc-400">
              {settings?.logo_slogan || 'SHOP • DISCOVER • ENJOY'}
            </p>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
            A global shopping destination uniting direct-selling quality with verified international partner collections.
          </p>

          {/* Official Social Media Icons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href={settings?.facebook_url || 'https://www.facebook.com/share/1WFDAntMgp/'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SHOPNEXA ROBI HUB Facebook Page"
              title="Facebook Page"
              className="w-9 h-9 border border-zinc-800 hover:border-[#C9A227] flex items-center justify-center text-zinc-300 hover:text-[#E4C76B] transition-colors"
            >
              <Facebook className="w-4 h-4" />
            </a>
            <a
              href={settings?.youtube_url || 'https://www.youtube.com/@shopnexamarketplase'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SHOPNEXA ROBI HUB YouTube Channel"
              title="YouTube Channel"
              className="w-9 h-9 border border-zinc-800 hover:border-[#C9A227] flex items-center justify-center text-zinc-300 hover:text-[#E4C76B] transition-colors"
            >
              <Youtube className="w-4 h-4" />
            </a>
            <a
              href={settings?.telegram_channel_url || 'https://t.me/shopnexamarketplase'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SHOPNEXA ROBI HUB Telegram Channel"
              title="Telegram Channel"
              className="w-9 h-9 border border-zinc-800 hover:border-[#C9A227] flex items-center justify-center text-zinc-300 hover:text-[#E4C76B] transition-colors"
            >
              <Send className="w-4 h-4" />
            </a>
            <a
              href={settings?.instagram_url || 'https://www.instagram.com/shopnexa978?knvt=NTd5OHhtMDN6bGc3'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SHOPNEXA ROBI HUB Instagram Profile"
              title="Instagram Profile"
              className="w-9 h-9 border border-zinc-800 hover:border-[#C9A227] flex items-center justify-center text-zinc-300 hover:text-[#E4C76B] transition-colors"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href={settings?.telegram_support_url || 'https://t.me/ShoponexaMarketplaseSuport'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SHOPNEXA ROBI HUB Telegram Customer Support"
              title="Telegram Customer Support"
              className="w-9 h-9 border border-zinc-800 hover:border-[#C9A227] flex items-center justify-center text-zinc-300 hover:text-[#E4C76B] transition-colors"
            >
              <Headphones className="w-4 h-4" />
            </a>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <a
              href={settings?.telegram_channel_url || 'https://t.me/shopnexamarketplase'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Join Telegram Channel</span>
            </a>
            <a
              href={settings?.telegram_support_url || 'https://t.me/ShoponexaMarketplaseSuport'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-700 hover:border-[#C9A227] text-white hover:text-[#E4C76B] text-xs font-semibold transition-colors"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Telegram Support</span>
            </a>
            {canShowCustomerDownload && <PWAInstallButton variant="footer" label="Download App" />}
          </div>
        </div>

        {/* Customer Service */}
        <div className="space-y-3 text-xs">
          <h3 className="font-semibold text-white tracking-wider">CUSTOMER SERVICE</h3>
          <ul className="space-y-2 text-zinc-400">
            <li>
              <a
                href={settings?.telegram_support_url || 'https://t.me/ShoponexaMarketplaseSuport'}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#E4C76B] transition-colors"
              >
                Telegram Support ({settings?.telegram_support_username || '@ShoponexaMarketplaseSuport'})
              </a>
            </li>
            <li>
              <button type="button" onClick={() => navigate({ page: 'track' })} className="hover:text-[#E4C76B]">
                Order Tracking
              </button>
            </li>
            <li>
              <button type="button" onClick={() => navigate({ page: 'policy', policyKey: 'shipping_policy' })} className="hover:text-[#E4C76B]">
                Shipping Information
              </button>
            </li>
            <li>
              <button type="button" onClick={() => navigate({ page: 'policy', policyKey: 'return_policy' })} className="hover:text-[#E4C76B]">
                Return Policy
              </button>
            </li>
            <li>
              <button type="button" onClick={() => navigate({ page: 'policy', policyKey: 'refund_policy' })} className="hover:text-[#E4C76B]">
                Refund Policy
              </button>
            </li>
            <li>
              <button type="button" onClick={() => navigate({ page: 'policy', policyKey: 'faq' })} className="hover:text-[#E4C76B]">
                FAQ
              </button>
            </li>
          </ul>
        </div>

        {/* Shopping & Company */}
        <div className="space-y-3 text-xs">
          <h3 className="font-semibold text-white tracking-wider">SHOPPING & COMPANY</h3>
          <ul className="space-y-2 text-zinc-400">
            <li>
              <button type="button" onClick={() => navigate({ page: 'shop', filter: 'all' })} className="hover:text-[#E4C76B]">
                All Products
              </button>
            </li>
            <li>
              <button type="button" onClick={() => navigate({ page: 'shop', filter: 'own' })} className="hover:text-[#E4C76B]">
                Direct Collection
              </button>
            </li>
            <li>
              <button type="button" onClick={() => navigate({ page: 'shop', filter: 'discount' })} className="hover:text-[#E4C76B]">
                Special Offers
              </button>
            </li>
            <li>
              <button type="button" onClick={() => navigate({ page: 'policy', policyKey: 'about_story' })} className="hover:text-[#E4C76B]">
                About Us
              </button>
            </li>
            <li>
              <button type="button" onClick={() => navigate({ page: 'policy', policyKey: 'privacy_policy' })} className="hover:text-[#E4C76B]">
                Privacy Policy
              </button>
            </li>
            <li>
              <button type="button" onClick={() => navigate({ page: 'policy', policyKey: 'terms_conditions' })} className="hover:text-[#E4C76B]">
                Terms & Conditions
              </button>
            </li>
          </ul>
        </div>

        {/* Contact Information */}
        <div className="space-y-3 text-xs">
          <h3 className="font-semibold text-white tracking-wider">CONTACT</h3>
          <div className="space-y-2.5 text-zinc-400">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
              <span>{settings?.contact_email || 'support@shopnexa.global'}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
              <span>{settings?.business_address || 'Rangpur, Bangladesh · Global Fulfillment'}</span>
            </div>
            <div className="flex items-start gap-2">
              <Send className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
              <a
                href={settings?.telegram_support_url || 'https://t.me/ShoponexaMarketplaseSuport'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#E4C76B] hover:underline"
              >
                {settings?.telegram_support_username || '@ShoponexaMarketplaseSuport'}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-900 py-5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} {settings?.brand_name || 'SHOPNEXA ROBI HUB'}. All rights reserved.</p>
          <p className="text-center sm:text-right">
            SHOP • DISCOVER • ENJOY — Global Direct Marketplace · Rangpur, Bangladesh
          </p>
        </div>
      </div>
    </footer>
  );
}
