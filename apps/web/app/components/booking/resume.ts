import type { BookingStatus } from '@/lib/api-types';
import type { ResumedBooking } from '@/lib/booking-api';

export type Step = 'customer' | 'preview' | 'payment' | 'success';
export type SuccessStatus = 'PENDING_VERIFICATION' | 'CONFIRMED' | 'REJECTED';

const DEAD: BookingStatus[] = ['EXPIRED', 'CANCELLED'];

/** Which screen a booking belongs on when the page is reopened. */
export function resumeStep(status: BookingStatus): Step {
  return status === 'PENDING_PAYMENT' || DEAD.includes(status) ? 'payment' : 'success';
}

/** Outcome shown on the last screen; null while the booking is still waiting for payment. */
export function successStatusOf(status: BookingStatus): SuccessStatus | null {
  if (status === 'PENDING_VERIFICATION' || status === 'REJECTED') return status;
  if (status === 'CONFIRMED' || status === 'COMPLETED') return 'CONFIRMED';
  return null;
}

/**
 * Local timestamp the payment window closes at, measured from the server's clock so a wrong clock
 * on this device cannot stretch or shrink it. A released slot gets a deadline in the past, which
 * makes the payment step render its "time is up" screen.
 */
export function deadlineFromResume(resume: ResumedBooking, now = Date.now()): number | null {
  if (DEAD.includes(resume.status)) return now - 1000;
  if (!resume.expiresAt) return null;
  return now + (Date.parse(resume.expiresAt) - Date.parse(resume.serverTime));
}
