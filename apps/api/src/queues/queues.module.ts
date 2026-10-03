import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from './queues.constants';
import { QueuesService } from './queues.service';

function redisConnection(url: string) {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, '');
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: database ? Number(database) : undefined,
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: redisConnection(configService.getOrThrow<string>('REDIS_URL')),
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.BOOKING_EXPIRATION },
      { name: QUEUE_NAMES.STORAGE_CLEANUP },
      { name: QUEUE_NAMES.OUTBOX },
    ),
  ],
  providers: [QueuesService],
  exports: [BullModule, QueuesService],
})
export class QueuesModule {}
