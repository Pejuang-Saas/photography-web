import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailSettingsService } from './email-settings.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationsController } from './notifications.controller';
import { WahaClient } from './waha.client';

@Module({
  controllers: [NotificationsController],
  providers: [EmailService, EmailSettingsService, NotificationDeliveryService, WahaClient],
  exports: [NotificationDeliveryService],
})
export class NotificationsModule {}
