/** Bookings that still matter to the customer; the others have lapsed, been refused or cancelled. */
const LIVE_STATUSES = new Set([
  'PENDING_PAYMENT',
  'PENDING_VERIFICATION',
  'CONFIRMED',
  'COMPLETED',
]);

export const isLiveBooking = (status: string) => LIVE_STATUSES.has(status);

/**
 * The booking to talk about with a customer who has several. A live one wins over a newer one that
 * expired, so a confirmation never quotes a schedule that no longer exists. Given newest first, it
 * falls back to the newest of the rest. The caller supplies them in that order.
 */
export function pickRelevantBooking<T extends { status: string }>(newestFirst: T[]): T | undefined {
  return newestFirst.find((booking) => isLiveBooking(booking.status)) ?? newestFirst[0];
}
