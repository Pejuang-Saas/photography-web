import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { logStructured } from '../../common/structured-log';
import { GallerySyncService } from '../../galleries/gallery-sync.service';
import { GallerySyncJob, QUEUE_NAMES } from '../queues.constants';

// Reading a Drive folder is a web request to Google; two at once is plenty.
@Processor(QUEUE_NAMES.GALLERY_SYNC, { concurrency: 2 })
export class GallerySyncProcessor extends WorkerHost {
  private readonly logger = new Logger(GallerySyncProcessor.name);

  constructor(private readonly sync: GallerySyncService) {
    super();
  }

  process(job: Job<GallerySyncJob>) {
    return this.sync.run(job.data.syncJobId);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    logStructured(this.logger, 'error', 'queue_job_failed', {
      queue: QUEUE_NAMES.GALLERY_SYNC,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      error: error.message,
    });
  }
}
