import { Injectable, Logger } from '@nestjs/common';
import { OutboxStatus, Prisma } from '@prisma/client';
import { QueuesService } from '../queues/queues.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDeliveryService } from '../notifications/notification-delivery.service';

type OutboxEventInput = {
  eventKey: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Prisma.InputJsonValue;
};

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueuesService,
    private readonly delivery: NotificationDeliveryService,
  ) {}

  createInTransaction(tx: Prisma.TransactionClient, input: OutboxEventInput) {
    return tx.outboxEvent.create({ data: input });
  }

  async sweep() {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] },
        availableAt: { lte: new Date() },
      },
      orderBy: { availableAt: 'asc' },
      take: 100,
    });

    for (const event of events) {
      await this.queues.scheduleOutbox(event.id);
    }
  }

  async process(eventId: string) {
    const event = await this.prisma.outboxEvent.findUnique({ where: { id: eventId } });
    if (!event || event.status === OutboxStatus.COMPLETED) return;

    const claimed = await this.prisma.outboxEvent.updateMany({
      where: {
        id: eventId,
        status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] },
        availableAt: { lte: new Date() },
      },
      data: {
        status: OutboxStatus.PROCESSING,
        attempts: { increment: 1 },
      },
    });
    if (claimed.count !== 1) return;

    try {
      await this.dispatch(event);
      await this.prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: OutboxStatus.COMPLETED,
          processedAt: new Date(),
          lastError: null,
        },
      });
    } catch (error) {
      const attempts = event.attempts + 1;
      await this.prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: OutboxStatus.FAILED,
          lastError: this.errorMessage(error),
          availableAt: new Date(Date.now() + this.retryDelay(attempts)),
        },
      });
      throw error;
    }
  }

  private async dispatch(event: {
    eventKey: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: Prisma.JsonValue;
  }) {
    const mode =
      process.env.OUTBOX_DELIVERY_MODE ??
      (process.env.NODE_ENV === 'production' ? 'disabled' : 'log');
    if (mode === 'disabled') {
      throw new Error('OUTBOX_DELIVERY_MODE is disabled; notification adapters are not configured');
    }

    if (mode === 'live') {
      await this.delivery.dispatch(event);
      return;
    }

    if (mode !== 'log') {
      throw new Error(`Unsupported OUTBOX_DELIVERY_MODE: ${mode}`);
    }

    // Log mode is intentionally development-only and never enabled by default in production.
    this.logger.log({
      message: 'Outbox event dispatched',
      eventKey: event.eventKey,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      payload: event.payload,
    });
  }

  private retryDelay(attempts: number) {
    return Math.min(60 * 60 * 1000, 2 ** Math.min(attempts, 10) * 1000);
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
