import { Inject, Injectable } from '@nestjs/common';
import { RedisToken } from '@nestjs-redis/client';
import type { RedisClientType } from 'redis';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(RedisToken()) private readonly redis: RedisClientType,
  ) {}

  getHello() {
    return {
      message: 'Photography Web API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const checks = await Promise.allSettled([this.prisma.$queryRaw`SELECT 1`, this.redis.ping()]);
    const database = checks[0].status === 'fulfilled' ? 'connected' : 'disconnected';
    const redis = checks[1].status === 'fulfilled' ? 'connected' : 'disconnected';
    return {
      status: database === 'connected' && redis === 'connected' ? 'ok' : 'error',
      checks: { database, redis },
      timestamp: new Date().toISOString(),
    };
  }
}
