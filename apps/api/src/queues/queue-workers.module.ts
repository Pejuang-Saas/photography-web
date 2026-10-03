import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { StorageModule } from '../storage/storage.module';
import { QueuesModule } from './queues.module';
import { BookingExpirationProcessor } from './processors/booking-expiration.processor';
import { StorageCleanupProcessor } from './processors/storage-cleanup.processor';

@Module({
  imports: [BookingsModule, QueuesModule, StorageModule],
  providers: [BookingExpirationProcessor, StorageCleanupProcessor],
})
export class QueueWorkersModule {}
