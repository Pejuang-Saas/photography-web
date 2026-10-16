import { ConflictException } from '@nestjs/common';
import { PaymentMode } from '@prisma/client';

/**
 * How long a booking holds its slot while waiting for payment. This is the single source of truth:
 * the booking deadline, the gateway invoice expiry and the public settings all derive from it.
 * Existing bookings keep the deadline they were created with.
 */
export const PAYMENT_WINDOW_MINUTES: Record<PaymentMode, number> = {
  GATEWAY: 60,
  MANUAL: 180,
};

export function paymentDeadline(mode: PaymentMode, from = new Date()) {
  return new Date(from.getTime() + PAYMENT_WINDOW_MINUTES[mode] * 60_000);
}

/** Rejects an action once the payment deadline has passed, without waiting for the expiry job. */
export function assertPaymentWindowOpen(expiresAt: Date | null, now = new Date()) {
  if (expiresAt && expiresAt.getTime() <= now.getTime()) {
    throw new ConflictException('Waktu pembayaran sudah habis. Silakan buat reservasi baru.');
  }
}

/** Time left on the deadline in whole seconds, never negative; null when there is no deadline. */
export function remainingSeconds(expiresAt: Date | null, now = new Date()) {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000));
}
