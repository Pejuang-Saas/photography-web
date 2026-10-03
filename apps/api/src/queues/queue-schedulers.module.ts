import { Module } from '@nestjs/common';
import { QueuesModule } from './queues.module';
import { QueueSchedulersService } from './queues.schedulers';

@Module({
  imports: [QueuesModule],
  providers: [QueueSchedulersService],
})
export class QueueSchedulersModule {}
