import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { StorageBucket } from '@prisma/client';
import { QUEUE_NAMES } from './queues.constants';

/**
 * Deterministic job id (so the same work is never queued twice). BullMQ rejects ":" in custom ids,
 * and a rejected add fails silently into a log line, so the separator must be something else.
 */
export function jobId(...parts: string[]) {
  return parts.join('-');
}

@Injectable()
export class QueuesService {
  constructor(
    @InjectQueue(QUEUE_NAMES.BOOKING_EXPIRATION)
    private readonly bookingExpirationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.STORAGE_CLEANUP)
    private readonly storageCleanupQueue: Queue,
    @InjectQueue(QUEUE_NAMES.OUTBOX)
    private readonly outboxQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EMAIL)
    private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.GALLERY_SYNC)
    private readonly gallerySyncQueue: Queue,
  ) {}

  scheduleBookingExpiration(bookingId: string, expiresAt: Date) {
    const delay = Math.max(0, expiresAt.getTime() - Date.now());
    return this.bookingExpirationQueue.add(
      'expire-booking',
      { bookingId },
      {
        jobId: jobId('booking-expiration', bookingId),
        delay,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: { age: 7 * 24 * 60 * 60, count: 1_000 },
      },
    );
  }

  scheduleStorageCleanup(bucket: StorageBucket, storageKey: string) {
    return this.storageCleanupQueue.add(
      'cleanup-storage-object',
      { bucket, storageKey },
      {
        jobId: jobId('storage-cleanup', bucket, storageKey),
        attempts: 10,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: { age: 7 * 24 * 60 * 60, count: 1_000 },
      },
    );
  }

  /**
   * Queues delivery of an outbox event. The sweep calls this without options. Right after the
   * event is written (`immediate`) the job gets its own id and a short delay: it may run before
   * the surrounding transaction is visible, and a no-op under the shared id would block the sweep
   * from ever queueing that event again.
   */
  scheduleOutbox(eventId: string, options: { immediate?: boolean } = {}) {
    return this.outboxQueue.add(
      'dispatch-outbox',
      { eventId },
      {
        jobId: options.immediate ? jobId('outbox-now', eventId) : jobId('outbox', eventId),
        ...(options.immediate ? { delay: 1_000 } : {}),
        attempts: 10,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: { age: 7 * 24 * 60 * 60, count: 1_000 },
      },
    );
  }

  /**
   * One job per sync run. It is not retried by the queue: a failed read of Drive is recorded on
   * the run itself, and the admin starts another with the button.
   */
  scheduleGallerySync(syncJobId: string) {
    return this.gallerySyncQueue.add(
      'sync-gallery',
      { syncJobId },
      {
        jobId: jobId('gallery-sync', syncJobId),
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: { age: 7 * 24 * 60 * 60, count: 1_000 },
      },
    );
  }

  /** One job per email log row, so retries re-send exactly the stored message. */
  scheduleEmail(logId: string, options: { resend?: boolean } = {}) {
    return this.emailQueue.add(
      'send-email',
      { logId },
      {
        // A resend needs a new id: the failed job is kept for a week and would block the old one.
        jobId: options.resend
          ? jobId('email', logId, 'resend', String(Date.now()))
          : jobId('email', logId),
        attempts: 5,
        backoff: { type: 'exponential', delay: 15_000 },
        removeOnComplete: 100,
        removeOnFail: { age: 7 * 24 * 60 * 60, count: 1_000 },
      },
    );
  }

  async getHealth() {
    const queues = [
      ['booking-expiration', this.bookingExpirationQueue],
      ['storage-cleanup', this.storageCleanupQueue],
      ['outbox', this.outboxQueue],
      ['email', this.emailQueue],
    ] as const;
    const entries = await Promise.all(
      queues.map(
        async ([name, queue]) =>
          [
            name,
            await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
          ] as const,
      ),
    );
    return Object.fromEntries(entries);
  }

  async getOperationalSnapshot() {
    const queues = [
      ['booking-expiration', this.bookingExpirationQueue],
      ['storage-cleanup', this.storageCleanupQueue],
      ['outbox', this.outboxQueue],
      ['email', this.emailQueue],
    ] as const;
    const entries = await Promise.all(
      queues.map(async ([name, queue]) => {
        const jobs = await queue.getFailed(0, 19);
        return [
          name,
          {
            counts: await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
            failedJobs: jobs.map((job) => ({
              id: job.id,
              name: job.name,
              attemptsMade: job.attemptsMade,
              failedReason: job.failedReason,
              timestamp: job.timestamp,
            })),
          },
        ] as const;
      }),
    );
    return {
      generatedAt: new Date().toISOString(),
      queues: Object.fromEntries(entries),
    };
  }
}
