import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { RAZORPAY_CONFIG } from '@/lib/payments/config';
import { grantAccess, revokePaymentAccess } from '@/lib/payments/entitlements';
import { verifyCapturedPayment } from '@/lib/payments/verification';

export async function POST(request: NextRequest) {
  if (!RAZORPAY_CONFIG.webhookSecret) return NextResponse.json({ error: 'Webhook configuration missing.' }, { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';
  const expected = createHmac('sha256', RAZORPAY_CONFIG.webhookSecret).update(raw).digest();
  if (!/^[a-f0-9]{64}$/i.test(signature) || !timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  try {
    const event = JSON.parse(raw);
    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (!payment?.id || !payment.order_id) throw new Error('Missing payment/order');
      const order = await verifyCapturedPayment(payment.id, payment.order_id);
      await grantAccess(order.user_id, payment.id, payment.order_id);
    } else if (event.event === 'refund.processed') {
      const refund = event.payload?.refund?.entity;
      if (!refund?.payment_id) throw new Error('Missing refunded payment');
      await revokePaymentAccess(refund.payment_id);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Payment webhook failed', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Webhook processing failed; provider should retry.' }, { status: 500 });
  }
}
