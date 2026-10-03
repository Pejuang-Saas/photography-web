import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { StorageBucket } from '@prisma/client';
import { logStructured } from '../../common/structured-log';
import { StorageCleanupService } from '../../storage/storage-cleanup.service';
import { QUEUE_NAMES, StorageCleanupJob } from '../queues.constants';

@Processor(QUEUE_NAMES.STORAGE_CLEANUP, { concurrency: 5 })
export class StorageCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(StorageCleanupProcessor.name);

  constructor(private readonly cleanup: StorageCleanupService) {
    super();
  }

  process(job: Job<StorageCleanupJob>) {
    if ('sweep' in job.data) return this.cleanup.enqueuePending();
    return this.cleanup.processQueuedObject(
      job.data.bucket === 'PRIVATE' ? StorageBucket.PRIVATE : StorageBucket.PUBLIC,
      job.data.storageKey,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    logStructured(this.logger, 'error', 'queue_job_failed', {
      queue: QUEUE_NAMES.STORAGE_CLEANUP,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      error: error.message,
    });
  }
}
