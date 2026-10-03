import { Injectable, Logger } from '@nestjs/common';
import { StorageBucket } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueuesService } from '../queues/queues.service';
import { StorageService } from './storage.service';

@Injectable()
export class StorageCleanupService {
  private readonly logger = new Logger(StorageCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queues: QueuesService,
  ) {}

  async removeOrQueue(bucket: StorageBucket, storageKey: string, reason: unknown) {
    try {
      await this.deleteObject(bucket, storageKey);
      return;
    } catch (deleteError) {
      await this.enqueue(bucket, storageKey, deleteError ?? reason);
    }
  }

  async processQueuedObject(bucket: StorageBucket, storageKey: string) {
    const record = await this.prisma.storageCleanup.findUnique({ where: { storageKey } });
    if (!record || record.cleanedAt) return;

    try {
      await this.deleteObject(bucket, storageKey);
      await this.prisma.storageCleanup.update({
        where: { id: record.id },
        data: { cleanedAt: new Date(), lastError: null },
      });
    } catch (error) {
      const attempts = record.attempts + 1;
      await this.prisma.storageCleanup.update({
        where: { id: record.id },
        data: {
          attempts,
          lastError: this.errorMessage(error),
          nextAttemptAt: new Date(Date.now() + this.retryDelay(attempts)),
        },
      });
      throw error;
    }
  }

  async enqueuePending() {
    const pending = await this.prisma.storageCleanup.findMany({
      where: {
        cleanedAt: null,
        nextAttemptAt: { lte: new Date() },
      },
      orderBy: { nextAttemptAt: 'asc' },
      take: 50,
    });

    for (const item of pending) {
      await this.queues.scheduleStorageCleanup(item.bucket, item.storageKey);
    }
  }

  private async enqueue(bucket: StorageBucket, storageKey: string, error: unknown) {
    try {
      await this.prisma.storageCleanup.upsert({
        where: { storageKey },
        create: {
          bucket,
          storageKey,
          attempts: 1,
          lastError: this.errorMessage(error),
          nextAttemptAt: new Date(Date.now() + this.retryDelay(1)),
        },
        update: {
          bucket,
          cleanedAt: null,
          attempts: { increment: 1 },
          lastError: this.errorMessage(error),
          nextAttemptAt: new Date(Date.now() + this.retryDelay(1)),
        },
      });
      await this.queues.scheduleStorageCleanup(bucket, storageKey);
      this.logger.warn(`Queued storage cleanup for ${bucket}/${storageKey}`);
    } catch (queueError) {
      this.logger.error(
        `Could not queue storage cleanup for ${bucket}/${storageKey}`,
        queueError instanceof Error ? queueError.stack : undefined,
      );
    }
  }

  private deleteObject(bucket: StorageBucket, storageKey: string) {
    return bucket === StorageBucket.PRIVATE
      ? this.storage.deletePaymentProof(storageKey)
      : this.storage.deleteObject(storageKey);
  }

  private retryDelay(attempts: number) {
    return Math.min(60 * 60 * 1000, 2 ** Math.min(attempts, 10) * 1000);
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
