import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { OutboxService } from '../../outbox/outbox.service';
import { QUEUE_NAMES, OutboxJob } from '../queues.constants';

@Processor(QUEUE_NAMES.OUTBOX, { concurrency: 10 })
export class OutboxProcessor extends WorkerHost {
  constructor(private readonly outbox: OutboxService) {
    super();
  }

  process(job: Job<OutboxJob>) {
    if ('sweep' in job.data) return this.outbox.sweep();
    return this.outbox.process(job.data.eventId);
  }
}
