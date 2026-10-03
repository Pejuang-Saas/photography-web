import { Module } from '@nestjs/common';
import { PackagesModule } from '../packages/packages.module';
import { PaymentsModule } from '../payments/payments.module';
import { StorageModule } from '../storage/storage.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [PackagesModule, PaymentsModule, StorageModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
