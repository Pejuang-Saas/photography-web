import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { BookingExpirationService } from '../../bookings/booking-expiration.service';
import { logStructured } from '../../common/structured-log';
import { QUEUE_NAMES, BookingExpirationJob } from '../queues.constants';

@Processor(QUEUE_NAMES.BOOKING_EXPIRATION, { concurrency: 10 })
export class BookingExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingExpirationProcessor.name);

  constructor(private readonly expiration: BookingExpirationService) {
    super();
  }

  process(job: Job<BookingExpirationJob>) {
    if ('sweep' in job.data) return this.expiration.sweep();
    return this.expiration.expire(job.data.bookingId);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    logStructured(this.logger, 'error', 'queue_job_failed', {
      queue: QUEUE_NAMES.BOOKING_EXPIRATION,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      error: error.message,
    });
  }
}
