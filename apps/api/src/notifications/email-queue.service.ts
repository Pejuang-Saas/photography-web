import { Injectable, Logger } from '@nestjs/common';
import { EmailLogStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { EmailAttachmentSpec } from './email-attachments';
import { QueuesService } from '../queues/queues.service';

export type EmailRequest = {
  /** Unique per message (for example `<event key>:email`), so retries of the caller never duplicate it. */
  dedupeKey: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachmentSpec[];
  templateCode?: string;
  bookingId?: string;
};

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueuesService,
  ) {}

  /** Stores the message and queues it. Calling again with the same dedupeKey is a no-op. */
  async enqueue(request: EmailRequest) {
    const { log, created } = await this.record(request, EmailLogStatus.QUEUED);

    // Also covers a previous call that stored the row but crashed before the job was added; the
    // job id is the log id, so adding it twice is harmless.
    if (log.status === EmailLogStatus.QUEUED) {
      await this.queues.scheduleEmail(log.id);
    }
    return { logId: log.id, duplicate: !created };
  }

  /** Keeps a trace of an email that was deliberately not sent, with the reason. */
  async skip(request: EmailRequest, reason: string) {
    const { log, created } = await this.record(request, EmailLogStatus.SKIPPED, reason);
    return { logId: log.id, duplicate: !created };
  }

  private async record(request: EmailRequest, status: EmailLogStatus, error?: string) {
    try {
      const log = await this.prisma.emailLog.create({
        data: {
          dedupeKey: request.dedupeKey,
          to: request.to,
          subject: request.subject,
          text: request.text,
          html: request.html,
          attachments: request.attachments?.length
            ? (request.attachments as unknown as Prisma.InputJsonValue)
            : undefined,
          templateCode: request.templateCode,
          bookingId: request.bookingId,
          status,
          error,
        },
      });
      return { log, created: true };
    } catch (caught) {
      if (caught instanceof Prisma.PrismaClientKnownRequestError && caught.code === 'P2002') {
        const existing = await this.prisma.emailLog.findUniqueOrThrow({
          where: { dedupeKey: request.dedupeKey },
        });
        return { log: existing, created: false };
      }
      this.logger.error(`Could not record email ${request.dedupeKey}: ${caught}`);
      throw caught;
    }
  }
}
