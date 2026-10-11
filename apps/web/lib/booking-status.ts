import type { AdminBooking } from './admin-api';

export type BadgeMeta = { label: string; className: string };

const amber = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30';
const emerald = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
const indigo = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30';
const rose = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30';
const zinc = 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30';

/** One badge that combines booking status and payment status into what the admin should see. */
export function bookingBadge(booking: Pick<AdminBooking, 'status' | 'paymentStatus'>): BadgeMeta {
  switch (booking.status) {
    case 'PENDING_PAYMENT':
      return { label: 'Belum Bayar', className: zinc };
    case 'PENDING_VERIFICATION':
      return { label: 'Verifikasi Struk', className: amber };
    case 'CONFIRMED':
      if (booking.paymentStatus === 'PAID_FULL') return { label: 'Lunas', className: emerald };
      if (booking.paymentStatus === 'PAID_DP') return { label: 'DP Terverifikasi', className: indigo };
      return { label: 'Terkonfirmasi', className: emerald };
    case 'COMPLETED':
      return { label: 'Selesai', className: indigo };
    case 'REJECTED':
      return { label: 'Ditolak', className: rose };
    case 'CANCELLED':
      return { label: 'Dibatalkan', className: rose };
    case 'EXPIRED':
      return { label: 'Kedaluwarsa', className: zinc };
  }
}

/** Statuses that hold a session slot on the calendar. */
export const SLOT_HOLDING_STATUSES = new Set([
  'PENDING_PAYMENT',
  'PENDING_VERIFICATION',
  'CONFIRMED',
  'COMPLETED',
]);

export const PAID_PAYMENT_STATUSES = new Set(['PAID_DP', 'PAID_FULL']);

/** Latest manual-transfer payment, which is the one an admin reviews. */
export function latestManualPayment(booking: Pick<AdminBooking, 'payments'>) {
  return booking.payments.find((p) => p.method !== 'GATEWAY') ?? null;
}
