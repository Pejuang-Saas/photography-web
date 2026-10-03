import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { OutboxModule } from '../outbox/outbox.module';
import { PaymentSettingsService } from './payment-settings.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MidtransClient } from './gateways/midtrans.client';
import { MidtransWebhookService } from './gateways/midtrans.webhook.service';
import { GatewayPaymentStateService } from './gateways/gateway-payment-state.service';
import { XenditClient } from './gateways/xendit.client';
import { XenditWebhookService } from './gateways/xendit.webhook.service';

@Module({
  imports: [OutboxModule, StorageModule],
  controllers: [PaymentsController],
  providers: [
    PaymentSettingsService,
    PaymentsService,
    GatewayPaymentStateService,
    MidtransClient,
    MidtransWebhookService,
    XenditClient,
    XenditWebhookService,
  ],
  exports: [PaymentSettingsService, PaymentsService],
})
export class PaymentsModule {}
