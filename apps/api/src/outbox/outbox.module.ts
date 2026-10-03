import { Module } from '@nestjs/common';
import { QueuesModule } from '../queues/queues.module';
import { OutboxService } from './outbox.service';

@Module({
  imports: [QueuesModule],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
