import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { RedisModule, RedisToken } from '@nestjs-redis/client';
import {
  RedisThrottlerStorage,
  ThrottlerAlgorithm,
} from '@nestjs-redis/throttler-storage';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { RedisClientType } from 'redis';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth/auth';
import { AdminAuthController } from './auth/admin-auth.controller';
import { CmsModule } from './cms/cms.module';

function positiveInteger(
  configService: ConfigService,
  key: string,
  fallback: number,
): number {
  const value = Number(configService.get<string>(key));

  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule.forRootAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        options: {
          url: configService.getOrThrow<string>('REDIS_URL'),
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, RedisToken()],
      useFactory: (configService: ConfigService, redis: RedisClientType) => {
        const ttl = positiveInteger(configService, 'THROTTLE_TTL_SECONDS', 60);
        const limit = positiveInteger(configService, 'THROTTLE_LIMIT', 60);
        const blockDuration = positiveInteger(
          configService,
          'THROTTLE_BLOCK_DURATION_SECONDS',
          60,
        );

        return {
          throttlers: [
            {
              name: 'default',
              ttl: seconds(ttl),
              limit,
              blockDuration: seconds(blockDuration),
            },
          ],
          storage: new RedisThrottlerStorage(
            redis,
            ThrottlerAlgorithm.SlidingWindowCounter,
          ),
        };
      },
    }),
    PrismaModule,
    AuthModule.forRoot({ auth }),
    CmsModule,
  ],
  controllers: [AppController, AdminAuthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
