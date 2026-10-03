import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { StorageBucket } from '@prisma/client';
import { QUEUE_NAMES } from './queues.constants';

@Injectable()
export class QueuesService {
  constructor(
    @InjectQueue(QUEUE_NAMES.BOOKING_EXPIRATION)
    private readonly bookingExpirationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.STORAGE_CLEANUP)
    private readonly storageCleanupQueue: Queue,
    @InjectQueue(QUEUE_NAMES.OUTBOX)
    private readonly outboxQueue: Queue,
  ) {}

  scheduleBookingExpiration(bookingId: string, expiresAt: Date) {
    const delay = Math.max(0, expiresAt.getTime() - Date.now());
    return this.bookingExpirationQueue.add(
      'expire-booking',
      { bookingId },
      {
        jobId: `booking-expiration:${bookingId}`,
        delay,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: true,
      },
    );
  }

  scheduleStorageCleanup(bucket: StorageBucket, storageKey: string) {
    return this.storageCleanupQueue.add(
      'cleanup-storage-object',
      { bucket, storageKey },
      {
        jobId: `storage-cleanup:${bucket}:${storageKey}`,
        attempts: 10,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: true,
      },
    );
  }

  scheduleOutbox(eventId: string) {
    return this.outboxQueue.add(
      'dispatch-outbox',
      { eventId },
      {
        jobId: `outbox:${eventId}`,
        attempts: 10,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: true,
      },
    );
  }
}
