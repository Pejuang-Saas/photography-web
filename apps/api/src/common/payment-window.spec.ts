import { PaymentMode } from '@prisma/client';
import {
  assertPaymentWindowOpen,
  PAYMENT_WINDOW_MINUTES,
  paymentDeadline,
  remainingSeconds,
} from './payment-window';

describe('payment window', () => {
  const now = new Date('2026-10-17T10:00:00.000Z');

  it('does not hold a slot for a day for any payment mode', () => {
    for (const minutes of Object.values(PAYMENT_WINDOW_MINUTES)) {
      expect(minutes).toBeGreaterThan(0);
      expect(minutes).toBeLessThan(24 * 60);
    }
  });

  it('builds the deadline from the mode', () => {
    expect(paymentDeadline(PaymentMode.GATEWAY, now).toISOString()).toBe(
      '2026-10-17T11:00:00.000Z',
    );
    expect(paymentDeadline(PaymentMode.MANUAL, now).toISOString()).toBe('2026-10-17T13:00:00.000Z');
  });

  it('rejects at and after the deadline, accepts before it or when there is none', () => {
    expect(() => assertPaymentWindowOpen(new Date('2026-10-17T10:00:00.000Z'), now)).toThrow(
      'Waktu pembayaran sudah habis',
    );
    expect(() => assertPaymentWindowOpen(new Date('2026-10-17T09:59:00.000Z'), now)).toThrow();
    expect(() => assertPaymentWindowOpen(new Date('2026-10-17T10:00:01.000Z'), now)).not.toThrow();
    expect(() => assertPaymentWindowOpen(null, now)).not.toThrow();
  });

  it('reports the remaining time rounded up and never below zero', () => {
    expect(remainingSeconds(new Date('2026-10-17T10:00:00.400Z'), now)).toBe(1);
    expect(remainingSeconds(new Date('2026-10-17T10:30:00.000Z'), now)).toBe(1800);
    expect(remainingSeconds(new Date('2026-10-17T09:00:00.000Z'), now)).toBe(0);
    expect(remainingSeconds(null, now)).toBeNull();
  });
});
