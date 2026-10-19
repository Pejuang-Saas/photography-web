import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisToken } from '@nestjs-redis/client';
import { Inject } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import type { RedisClientType } from 'redis';

/** What changed, never the data itself: the browser fetches what it needs when it hears this. */
export type CrmEvent =
  /** A message arrived, was sent, or its delivery receipt changed. */
  | { type: 'message'; chatId: string }
  /** A conversation's read state or category changed. */
  | { type: 'chat'; chatId: string }
  /** The category list itself changed. */
  | { type: 'categories' };

const CHANNEL = 'crm:events';

/**
 * Fans CRM changes out to every connected admin. Events go through Redis so that it also works
 * when more than one API instance runs: a webhook handled by one reaches browsers held by another.
 */
@Injectable()
export class CrmEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CrmEventsService.name);
  private readonly events = new Subject<CrmEvent>();
  private subscriber?: RedisClientType;

  constructor(@Inject(RedisToken()) private readonly redis: RedisClientType) {}

  async onModuleInit() {
    try {
      this.subscriber = this.redis.duplicate();
      this.subscriber.on('error', (error) =>
        this.logger.warn(`Redis subscriber: ${error.message}`),
      );
      await this.subscriber.connect();
      await this.subscriber.subscribe(CHANNEL, (raw) => {
        try {
          this.events.next(JSON.parse(raw) as CrmEvent);
        } catch {
          // Not ours to interpret; ignore.
        }
      });
    } catch (error) {
      // Live updates are a convenience; the inbox keeps polling as a fallback.
      this.logger.warn(`Live updates unavailable: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    this.events.complete();
    await this.subscriber?.quit().catch(() => undefined);
  }

  /** Never throws and never waits for the browsers: a failed notification must not fail a webhook. */
  publish(event: CrmEvent) {
    this.redis.publish(CHANNEL, JSON.stringify(event)).catch((error: Error) => {
      this.logger.warn(`Could not publish ${event.type}: ${error.message}`);
    });
  }

  stream(): Observable<CrmEvent> {
    return this.events.asObservable();
  }
}
