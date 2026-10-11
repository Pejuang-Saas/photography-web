import { Module } from '@nestjs/common';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsService } from './admin-notifications.service';
import { EmailService } from './email.service';
import { EmailSettingsService } from './email-settings.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationsController } from './notifications.controller';
import { WahaClient } from './waha.client';

@Module({
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [
    AdminNotificationsService,
    EmailService,
    EmailSettingsService,
    NotificationDeliveryService,
    WahaClient,
  ],
  exports: [NotificationDeliveryService],
})
export class NotificationsModule {}
