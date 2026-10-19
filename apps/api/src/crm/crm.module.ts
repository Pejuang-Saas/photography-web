import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { StudioModule } from '../studio/studio.module';
import { WahaModule } from '../waha/waha.module';
import { CrmCategoriesService } from './crm-categories.service';
import { CrmChatsService } from './crm-chats.service';
import { CrmEventsService } from './crm-events.service';
import { CrmController } from './crm.controller';
import { WahaWebhookController } from './waha-webhook.controller';
import { WahaWebhookService } from './waha-webhook.service';
import { WhatsappInboxService } from './whatsapp-inbox.service';
import { WhatsappMediaService } from './whatsapp-media.service';
import { WhatsappSendService } from './whatsapp-send.service';
import { WhatsappSyncService } from './whatsapp-sync.service';
import { WhatsappTemplatesService } from './whatsapp-templates.service';

@Module({
  imports: [StorageModule, StudioModule, WahaModule],
  controllers: [CrmController, WahaWebhookController],
  providers: [
    CrmCategoriesService,
    CrmChatsService,
    CrmEventsService,
    WahaWebhookService,
    WhatsappInboxService,
    WhatsappMediaService,
    WhatsappSendService,
    WhatsappSyncService,
    WhatsappTemplatesService,
  ],
})
export class CrmModule {}
