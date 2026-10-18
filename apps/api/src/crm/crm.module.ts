import { Module } from '@nestjs/common';
import { WahaModule } from '../waha/waha.module';
import { CrmCategoriesService } from './crm-categories.service';
import { CrmChatsService } from './crm-chats.service';
import { CrmController } from './crm.controller';
import { WahaWebhookController } from './waha-webhook.controller';
import { WahaWebhookService } from './waha-webhook.service';
import { WhatsappInboxService } from './whatsapp-inbox.service';
import { WhatsappSyncService } from './whatsapp-sync.service';

@Module({
  imports: [WahaModule],
  controllers: [CrmController, WahaWebhookController],
  providers: [
    CrmCategoriesService,
    CrmChatsService,
    WahaWebhookService,
    WhatsappInboxService,
    WhatsappSyncService,
  ],
})
export class CrmModule {}
