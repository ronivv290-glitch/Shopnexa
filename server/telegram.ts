import { getSiteSettings } from './db.ts';

export type TelegramAlertType =
  | 'new_order'
  | 'new_customer'
  | 'payment'
  | 'low_stock'
  | 'order_status'
  | 'support';

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim());
}

export async function sendTelegramAlert(type: TelegramAlertType, message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) {
    return false;
  }

  try {
    const settings = getSiteSettings();
    if (!settings.telegram_alerts?.[type]) {
      return false;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `SHOPNEXA ROBI HUB Alert\n${message}`,
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
