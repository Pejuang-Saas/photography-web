import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { StorageBucket } from '@prisma/client';
import { StorageCleanupService } from '../../storage/storage-cleanup.service';
import { QUEUE_NAMES, StorageCleanupJob } from '../queues.constants';

@Processor(QUEUE_NAMES.STORAGE_CLEANUP, { concurrency: 5 })
export class StorageCleanupProcessor extends WorkerHost {
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
}
