import { createHmac } from 'node:crypto';
import { URL } from 'node:url';
import { userOrderMap } from '@/states/swappedState';
import type { Context, Root } from '@/types';

export async function generateSwappedUrlResolver(
  _root: Root,
  args: {
    currencyCode: string;
    walletAddress: string;
    amount: string;
    userId: string;
  },
  ctx: Context,
) {
  const { currencyCode, walletAddress, amount, userId } = args;

  const publicKey = ctx.server.config.SWAPPED_PUBLIC_KEY;
  const secretKey = ctx.server.config.SWAPPED_SECRET_KEY;
  const styleKey = ctx.server.config.SWAPPED_STYLE_KEY;

  if (!publicKey || !secretKey) {
    throw new Error('Server configuration error: Missing SWAPPED_PUBLIC_KEY or SWAPPED_SECRET_KEY');
  }

  if (!currencyCode || !walletAddress || !amount || !userId) {
    throw new Error('Missing required parameters: currencyCode, walletAddress, amount, userId');
  }

  try {
    const responseUrl = encodeURIComponent(
      `${ctx.server.config.BASE_URL}/swapped/webhook?userId=${userId}`,
    );
    let baseUrl: string;

    if (process.env.NODE_ENV === 'local') {
      baseUrl = `https://sandbox.swapped.com/?apiKey=${publicKey}&currencyCode=${currencyCode}&walletAddress=${walletAddress}&baseCurrencyCode=USD&baseCurrencyAmount=${amount}&style=${styleKey}&lockAmount=true&responseUrl=${responseUrl}`;
    } else {
      baseUrl = `https://widget.swapped.com/?apiKey=${publicKey}&currencyCode=${currencyCode}&walletAddress=${walletAddress}&baseCurrencyCode=USD&baseCurrencyAmount=${amount}&style=${styleKey}&lockAmount=true&responseUrl=${responseUrl}`;
    }

    const signature = createHmac('sha256', secretKey)
      .update(new URL(baseUrl).search)
      .digest('base64');

    const signedUrl = `${baseUrl}&signature=${encodeURIComponent(signature)}`;

    return {
      signedUrl,
      originalUrl: baseUrl,
      signature,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export async function getSwappedStatusResolver(
  _root: Root,
  args: {
    userId: string;
  },
  ctx: Context,
) {
  const { userId } = args;

  if (!userId) {
    throw new Error('Missing required parameter: userId');
  }

  const publicKey = ctx.server.config.SWAPPED_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error('SWAPPED_PUBLIC_KEY not configured');
  }

  const orderId = userOrderMap.get(userId);
  if (!orderId) {
    return {
      status: 'waiting',
      message: 'Waiting for order creation from webhook',
      orderId: null,
      data: null,
    };
  }

  try {
    const statusResponse = await fetch('https://sandbox.swapped.com/api/v1/merchant/get_status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: orderId,
        api_key: publicKey,
      }),
    });

    const statusData = await statusResponse.json();

    if (
      (statusData as { data?: { order_status?: string } }).data?.order_status === 'order_completed'
    ) {
      userOrderMap.delete(userId);
      console.log(`🗑️ Deleted completed order record for user: ${userId}`);
    }

    return {
      status: 'success',
      message: 'Order status retrieved successfully',
      orderId,
      data: statusData,
    };
  } catch (error) {
    console.error(`❌ Status check error for order ${orderId}:`, error);
    throw new Error(
      `Failed to fetch order status: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
