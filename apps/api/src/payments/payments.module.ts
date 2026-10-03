import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { OutboxModule } from '../outbox/outbox.module';
import { PaymentSettingsService } from './payment-settings.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [OutboxModule, StorageModule],
  controllers: [PaymentsController],
  providers: [PaymentSettingsService, PaymentsService],
  exports: [PaymentSettingsService, PaymentsService],
})
export class PaymentsModule {}
