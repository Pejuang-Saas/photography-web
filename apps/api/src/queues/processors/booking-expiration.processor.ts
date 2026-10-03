import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BookingExpirationService } from '../../bookings/booking-expiration.service';
import { QUEUE_NAMES, BookingExpirationJob } from '../queues.constants';

@Processor(QUEUE_NAMES.BOOKING_EXPIRATION, { concurrency: 10 })
export class BookingExpirationProcessor extends WorkerHost {
  constructor(private readonly expiration: BookingExpirationService) {
    super();
  }

  process(job: Job<BookingExpirationJob>) {
    if ('sweep' in job.data) return this.expiration.sweep();
    return this.expiration.expire(job.data.bookingId);
  }
}
