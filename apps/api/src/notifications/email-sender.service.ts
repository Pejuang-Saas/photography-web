import { Injectable } from '@nestjs/common';
import { EmailLogStatus } from '@prisma/client';
import { LOGO_CID, studioLogo } from '../common/logo';
import { InvoicePdfService } from '../invoices/invoice-pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { parseAttachmentSpecs, type EmailAttachmentSpec } from './email-attachments';
import { EmailService, type OutgoingEmail } from './email.service';

/** Runs inside the email queue worker: sends the stored message and records the outcome. */
@Injectable()
export class EmailSenderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly invoicePdf: InvoicePdfService,
  ) {}

  async send(logId: string) {
    const log = await this.prisma.emailLog.findUnique({ where: { id: logId } });
    // Nothing to do for a deleted row, or one that already went out (a duplicate job).
    if (!log || log.status !== EmailLogStatus.QUEUED) return;

    try {
      await this.email.deliver({
        to: log.to,
        subject: log.subject,
        text: log.text,
        html: log.html ?? undefined,
        attachments: await this.resolveAttachments(parseAttachmentSpecs(log.attachments)),
        messageKey: log.dedupeKey,
      });
    } catch (error) {
      // Stays QUEUED while the queue still has retries left; markFailed() settles it afterwards.
      await this.prisma.emailLog.update({
        where: { id: logId },
        data: { attempts: { increment: 1 }, error: this.describe(error) },
      });
      throw error;
    }

    await this.prisma.emailLog.update({
      where: { id: logId },
      data: {
        status: EmailLogStatus.SENT,
        attempts: { increment: 1 },
        sentAt: new Date(),
        error: null,
      },
    });
  }

  /** Called when the queue has given up on the job. */
  async markFailed(logId: string, error: string) {
    await this.prisma.emailLog.updateMany({
      where: { id: logId, status: EmailLogStatus.QUEUED },
      data: { status: EmailLogStatus.FAILED, error: error.slice(0, 500) },
    });
  }

  /** Produces the files only now, at send time, so every retry builds them fresh. */
  private async resolveAttachments(specs: EmailAttachmentSpec[]) {
    const files: NonNullable<OutgoingEmail['attachments']> = [];
    for (const spec of specs) {
      if (spec.type === 'logo') {
        const logo = studioLogo();
        if (logo)
          files.push({
            filename: 'logo.png',
            content: logo,
            contentType: 'image/png',
            cid: LOGO_CID,
          });
      } else {
        const pdf = await this.invoicePdf.render(spec.invoiceId);
        files.push({ filename: pdf.filename, content: pdf.buffer, contentType: 'application/pdf' });
      }
    }
    return files.length ? files : undefined;
  }

  private describe(error: unknown) {
    return (error instanceof Error ? error.message : String(error)).slice(0, 500);
  }
}
