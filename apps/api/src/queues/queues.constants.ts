export const QUEUE_NAMES = {
  BOOKING_EXPIRATION: 'booking-expiration',
  STORAGE_CLEANUP: 'storage-cleanup',
  OUTBOX: 'outbox',
} as const;

export type BookingExpirationJob = { bookingId: string } | { sweep: true };

export type StorageCleanupJob =
  { bucket: 'PUBLIC' | 'PRIVATE'; storageKey: string } | { sweep: true };

export type OutboxJob = { eventId: string } | { sweep: true };
