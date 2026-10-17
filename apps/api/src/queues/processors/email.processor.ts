import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { logStructured } from '../../common/structured-log';
import { EmailSenderService } from '../../notifications/email-sender.service';
import { QUEUE_NAMES, EmailJob } from '../queues.constants';

// SMTP providers throttle senders (Gmail allows only a few per minute), so mail is rate limited.
const MAX_PER_MINUTE = Number(process.env.EMAIL_RATE_LIMIT_PER_MINUTE) || 20;

@Processor(QUEUE_NAMES.EMAIL, {
  concurrency: 2,
  limiter: { max: MAX_PER_MINUTE, duration: 60_000 },
})
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly sender: EmailSenderService) {
    super();
  }

  process(job: Job<EmailJob>) {
    return this.sender.send(job.data.logId);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<EmailJob> | undefined, error: Error) {
    logStructured(this.logger, 'error', 'queue_job_failed', {
      queue: QUEUE_NAMES.EMAIL,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      error: error.message,
    });

    // Only the last failure ends the email's life; earlier ones are retried with backoff.
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      await this.sender.markFailed(job.data.logId, error.message);
    }
  }
}
