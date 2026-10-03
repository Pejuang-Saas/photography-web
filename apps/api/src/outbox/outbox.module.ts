import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueuesModule } from '../queues/queues.module';
import { OutboxService } from './outbox.service';

@Module({
  imports: [NotificationsModule, QueuesModule],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
