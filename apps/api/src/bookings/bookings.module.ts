import { Module } from '@nestjs/common';
import { PackagesModule } from '../packages/packages.module';
import { OutboxModule } from '../outbox/outbox.module';
import { PaymentsModule } from '../payments/payments.module';
import { QueuesModule } from '../queues/queues.module';
import { StorageModule } from '../storage/storage.module';
import { BookingsController } from './bookings.controller';
import { BookingExpirationService } from './booking-expiration.service';
import { BookingsService } from './bookings.service';

@Module({
  imports: [OutboxModule, PackagesModule, PaymentsModule, QueuesModule, StorageModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingExpirationService],
  exports: [BookingExpirationService],
})
export class BookingsModule {}
