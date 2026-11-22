import type { PaymentMethod } from '../src/types.ts';

export function isGatewayEnvConfigured(gateway: PaymentMethod): boolean {
  if (gateway === 'bkash') {
    return Boolean(
      process.env.BKASH_APP_KEY?.trim() &&
        process.env.BKASH_APP_SECRET?.trim() &&
        process.env.BKASH_USERNAME?.trim() &&
        process.env.BKASH_PASSWORD?.trim()
    );
  }
  if (gateway === 'nagad') {
    return Boolean(
      process.env.NAGAD_MERCHANT_ID?.trim() &&
        process.env.NAGAD_PUBLIC_KEY?.trim() &&
        process.env.NAGAD_PRIVATE_KEY?.trim()
    );
  }
  if (gateway === 'cod') {
    return true;
  }
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export interface GatewayVerificationResult {
  verified: boolean;
  gatewayReference: string;
  mode: 'live_api' | 'merchant_verification_pending';
  message: string;
}

export async function verifyGatewayTransaction(
  gateway: PaymentMethod,
  transactionId: string,
  amount: number,
  sandboxMode: boolean
): Promise<GatewayVerificationResult> {
  if (gateway === 'cod') {
    return {
      verified: false,
      gatewayReference: 'COD_ON_DELIVERY',
      mode: 'merchant_verification_pending',
      message: 'Cash on Delivery selected. Payment will be collected upon delivery.',
    };
  }

  if (gateway === 'bkash' && isGatewayEnvConfigured('bkash')) {
    const baseUrl = sandboxMode
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
    try {
      const tokenRes = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          username: process.env.BKASH_USERNAME!,
          password: process.env.BKASH_PASSWORD!,
        },
        body: JSON.stringify({
          app_key: process.env.BKASH_APP_KEY,
          app_secret: process.env.BKASH_APP_SECRET,
        }),
      });
      if (tokenRes.ok) {
        const tokenData = (await tokenRes.json()) as { id_token?: string };
        if (tokenData.id_token && transactionId) {
          const searchRes = await fetch(`${baseUrl}/tokenized/checkout/general/searchTransaction`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: tokenData.id_token,
              'X-APP-Key': process.env.BKASH_APP_KEY!,
            },
            body: JSON.stringify({ trxID: transactionId }),
          });
          if (searchRes.ok) {
            const trxData = (await searchRes.json()) as {
              transactionStatus?: string;
              amount?: string;
              trxID?: string;
            };
            const paidAmount = Number(trxData.amount || 0);
            if (trxData.transactionStatus === 'Completed' && paidAmount >= amount) {
              return {
                verified: true,
                gatewayReference: trxData.trxID || transactionId,
                mode: 'live_api',
                message: 'bKash transaction verified via official API.',
              };
            }
          }
        }
      }
    } catch {
      // Fall through to merchant verification queue if gateway network call fails
    }
  }

  if (gateway === 'nagad' && isGatewayEnvConfigured('nagad')) {
    const baseUrl = sandboxMode
      ? 'https://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs'
      : 'https://api.mynagad.com/api/dfs';
    try {
      const checkRes = await fetch(`${baseUrl}/verify/payment/${encodeURIComponent(transactionId)}`);
      if (checkRes.ok) {
        const data = (await checkRes.json()) as { status?: string; amount?: string; issuerPaymentRefNo?: string };
        if (data.status === 'Success' && Number(data.amount || 0) >= amount) {
          return {
            verified: true,
            gatewayReference: data.issuerPaymentRefNo || transactionId,
            mode: 'live_api',
            message: 'Nagad transaction verified via official API.',
          };
        }
      }
    } catch {
      // Fall through to merchant verification queue
    }
  }

  return {
    verified: false,
    gatewayReference: transactionId || '',
    mode: 'merchant_verification_pending',
    message: 'Transaction ID recorded and queued for merchant payment verification.',
  };
}
