import 'server-only';
import Razorpay from 'razorpay';
import { createSql } from '@/lib/db/service';
import { RAZORPAY_CONFIG } from './config';

export async function verifyCapturedPayment(paymentId: string, orderId: string, userId?: string) {
  const sql = createSql();
  const order = (await sql`SELECT * FROM payment_orders WHERE order_id = ${orderId}`)[0];
  if (!order || (userId && order.user_id !== userId)) throw new Error('Order does not belong to this account.');
  const provider = new Razorpay({ key_id: RAZORPAY_CONFIG.keyId, key_secret: RAZORPAY_CONFIG.keySecret });
  const payment = await provider.payments.fetch(paymentId);
  if (payment.order_id !== orderId || payment.status !== 'captured' || Number(payment.amount_refunded || 0) > 0 || Number(payment.amount) !== order.amount || payment.currency !== order.currency) throw new Error('Payment capture, order, amount or currency could not be verified.');
  return order;
}
