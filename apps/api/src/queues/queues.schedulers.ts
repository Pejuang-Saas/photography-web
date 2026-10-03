import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queues.constants';

@Injectable()
export class QueueSchedulersService implements OnModuleInit {
  private readonly logger = new Logger(QueueSchedulersService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.BOOKING_EXPIRATION)
    private readonly bookingExpirationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.STORAGE_CLEANUP)
    private readonly storageCleanupQueue: Queue,
  ) {}

  async onModuleInit() {
    await Promise.all([
      this.bookingExpirationQueue.upsertJobScheduler(
        'booking-expiration-sweep',
        { every: 60_000 },
        {
          name: 'sweep-expired-bookings',
          data: { sweep: true },
          opts: { attempts: 3, backoff: { type: 'exponential', delay: 5_000 } },
        },
      ),
      this.storageCleanupQueue.upsertJobScheduler(
        'storage-cleanup-sweep',
        { every: 300_000 },
        {
          name: 'sweep-storage-cleanup',
          data: { sweep: true },
          opts: { attempts: 3, backoff: { type: 'exponential', delay: 5_000 } },
        },
      ),
    ]).catch((error) => {
      this.logger.error(
        'Could not register BullMQ job schedulers',
        error instanceof Error ? error.stack : undefined,
      );
    });
  }
}
