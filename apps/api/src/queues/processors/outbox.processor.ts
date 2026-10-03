import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { logStructured } from '../../common/structured-log';
import { OutboxService } from '../../outbox/outbox.service';
import { QUEUE_NAMES, OutboxJob } from '../queues.constants';

@Processor(QUEUE_NAMES.OUTBOX, { concurrency: 10 })
export class OutboxProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(private readonly outbox: OutboxService) {
    super();
  }

  process(job: Job<OutboxJob>) {
    if ('sweep' in job.data) return this.outbox.sweep();
    return this.outbox.process(job.data.eventId);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    logStructured(this.logger, 'error', 'queue_job_failed', {
      queue: QUEUE_NAMES.OUTBOX,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      error: error.message,
    });
  }
}
