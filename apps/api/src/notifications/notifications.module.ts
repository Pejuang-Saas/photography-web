import { Module } from '@nestjs/common';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsService } from './admin-notifications.service';
import { InvoicesModule } from '../invoices/invoices.module';
import { QueuesModule } from '../queues/queues.module';
import { StudioModule } from '../studio/studio.module';
import { EmailLogsController } from './email-logs.controller';
import { EmailLogsService } from './email-logs.service';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplatesService } from './email-templates.service';
import { EmailQueueService } from './email-queue.service';
import { EmailSenderService } from './email-sender.service';
import { EmailService } from './email.service';
import { EmailSettingsService } from './email-settings.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationsController } from './notifications.controller';
import { WhatsappEventMessagesService } from './whatsapp-event-messages.service';
import { WahaModule } from '../waha/waha.module';

@Module({
  imports: [InvoicesModule, QueuesModule, StudioModule, WahaModule],
  controllers: [
    NotificationsController,
    AdminNotificationsController,
    EmailTemplatesController,
    EmailLogsController,
  ],
  providers: [
    AdminNotificationsService,
    EmailLogsService,
    EmailQueueService,
    EmailSenderService,
    EmailService,
    EmailTemplatesService,
    EmailSettingsService,
    NotificationDeliveryService,
    WhatsappEventMessagesService,
  ],
  exports: [NotificationDeliveryService, EmailSenderService],
})
export class NotificationsModule {}
