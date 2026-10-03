import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { OutboxModule } from '../outbox/outbox.module';
import { StorageModule } from '../storage/storage.module';
import { QueuesModule } from './queues.module';
import { BookingExpirationProcessor } from './processors/booking-expiration.processor';
import { OutboxProcessor } from './processors/outbox.processor';
import { StorageCleanupProcessor } from './processors/storage-cleanup.processor';

@Module({
  imports: [BookingsModule, OutboxModule, QueuesModule, StorageModule],
  providers: [BookingExpirationProcessor, OutboxProcessor, StorageCleanupProcessor],
})
export class QueueWorkersModule {}
