import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { QueueSchedulersModule } from './queues/queue-schedulers.module';
import { QueueWorkersModule } from './queues/queue-workers.module';
import { QueuesModule } from './queues/queues.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    QueuesModule,
    QueueSchedulersModule,
    QueueWorkersModule,
  ],
})
export class WorkerModule {}
