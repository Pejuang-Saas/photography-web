import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { GalleriesModule } from '../galleries/galleries.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OutboxModule } from '../outbox/outbox.module';
import { StorageModule } from '../storage/storage.module';
import { QueuesModule } from './queues.module';
import { BookingExpirationProcessor } from './processors/booking-expiration.processor';
import { EmailProcessor } from './processors/email.processor';
import { GallerySyncProcessor } from './processors/gallery-sync.processor';
import { OutboxProcessor } from './processors/outbox.processor';
import { StorageCleanupProcessor } from './processors/storage-cleanup.processor';

@Module({
  imports: [
    BookingsModule,
    GalleriesModule,
    NotificationsModule,
    OutboxModule,
    QueuesModule,
    StorageModule,
  ],
  providers: [
    BookingExpirationProcessor,
    EmailProcessor,
    GallerySyncProcessor,
    OutboxProcessor,
    StorageCleanupProcessor,
  ],
})
export class QueueWorkersModule {}
