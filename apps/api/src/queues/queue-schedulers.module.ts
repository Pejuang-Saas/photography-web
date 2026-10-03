import { Module } from '@nestjs/common';
import { QueuesModule } from './queues.module';
import { QueueSchedulersService } from './queues.schedulers';
import { QueueAlertService } from './queue-alert.service';

@Module({
  imports: [QueuesModule],
  providers: [QueueSchedulersService, QueueAlertService],
})
export class QueueSchedulersModule {}
