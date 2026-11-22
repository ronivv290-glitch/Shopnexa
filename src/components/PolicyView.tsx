import React from 'react';
import { useStore } from '../context/StoreContext.tsx';

export function PolicyView({ policyKey }: { policyKey: string }) {
  const { settings, navigate } = useStore();

  const POLICY_MAP: Record<string, { title: string; body: string }> = {
    about_story: {
      title: 'About SHOPNEXA',
      body:
        settings?.about_story ||
        'SHOPNEXA — THE FUTURE OF SHOPPING is an international hybrid marketplace offering both direct-selling products and curated AliExpress partner discoveries.',
    },
    shipping_policy: {
      title: 'Shipping Information',
      body: settings?.shipping_policy || '',
    },
    return_policy: {
      title: 'Return Policy',
      body: settings?.return_policy || '',
    },
    refund_policy: {
      title: 'Refund Policy',
      body: settings?.refund_policy || '',
    },
    privacy_policy: {
      title: 'Privacy Policy',
      body: settings?.privacy_policy || '',
    },
    terms_conditions: {
      title: 'Terms & Conditions',
      body: settings?.terms_conditions || '',
    },
    affiliate_disclosure: {
      title: 'Affiliate Disclosure',
      body: settings?.affiliate_disclosure || '',
    },
    faq: {
      title: 'Frequently Asked Questions',
      body:
        'Q: What is the difference between Own Products and Affiliate Products?\n' +
        'A: Own Products are fulfilled directly by SHOPNEXA with bKash, Nagad, Cash on Delivery, or International checkout. Affiliate Products redirect to AliExpress via our official partner link where AliExpress handles payment and fulfillment.\n\n' +
        'Q: Does SHOPNEXA ever ask for my bKash or Nagad PIN or OTP?\n' +
        'A: Never. SHOPNEXA only verifies your Transaction ID (TrxID) or uses authorized gateway APIs.\n\n' +
        'Q: How can I contact customer support?\n' +
        `A: Reach us anytime via Telegram at ${settings?.telegram_support_username || '@ShoponexaMarketplaseSuport'} or email ${settings?.contact_email || 'support@shopnexa.global'}.`,
    },
  };

  const entry = POLICY_MAP[policyKey] || POLICY_MAP.about_story;

  return (
    <div className="max-w-3xl mx-auto px-4 py-14 space-y-6">
      <button
        type="button"
        onClick={() => navigate({ page: 'home' })}
        className="text-xs font-semibold text-zinc-500 hover:text-black"
      >
        ← Back to Homepage
      </button>
      <div className="border border-zinc-200 p-8 bg-white space-y-4">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#9C7A16]">SHOPNEXA POLICY</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-950">{entry.title}</h1>
        <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">{entry.body}</p>
      </div>
    </div>
  );
}
