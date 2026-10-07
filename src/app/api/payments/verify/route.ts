import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { requireAuth } from '@/lib/api-auth';
import { grantAccess } from '@/lib/payments/entitlements';
import { RAZORPAY_CONFIG, isCheckoutEnabled } from '@/lib/payments/config';
import { verifyCapturedPayment } from '@/lib/payments/verification';

export async function POST(request: NextRequest) {
  if (!isCheckoutEnabled()) return NextResponse.json({ error: 'Checkout is not enabled.' }, { status: 503 });
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = await request.json();
    if (![orderId, paymentId, signature].every(v => typeof v === 'string' && v.length < 200) || !/^[a-f0-9]{64}$/i.test(signature)) return NextResponse.json({ error: 'Invalid payment parameters.' }, { status: 400 });
    const expected = createHmac('sha256', RAZORPAY_CONFIG.keySecret).update(`${orderId}|${paymentId}`).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return NextResponse.json({ error: 'Invalid payment signature.' }, { status: 400 });
    await verifyCapturedPayment(paymentId, orderId, auth.userId!);
    await grantAccess(auth.userId!, paymentId, orderId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Payment could not be verified. Access has not been granted.' }, { status: 502 });
  }
}
