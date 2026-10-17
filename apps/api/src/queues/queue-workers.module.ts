import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OutboxModule } from '../outbox/outbox.module';
import { StorageModule } from '../storage/storage.module';
import { QueuesModule } from './queues.module';
import { BookingExpirationProcessor } from './processors/booking-expiration.processor';
import { EmailProcessor } from './processors/email.processor';
import { OutboxProcessor } from './processors/outbox.processor';
import { StorageCleanupProcessor } from './processors/storage-cleanup.processor';

@Module({
  imports: [BookingsModule, NotificationsModule, OutboxModule, QueuesModule, StorageModule],
  providers: [BookingExpirationProcessor, EmailProcessor, OutboxProcessor, StorageCleanupProcessor],
})
export class QueueWorkersModule {}
