import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailQueueService } from './email-queue.service';
import { EmailSettingsService } from './email-settings.service';
import { readSmtpConfig } from './smtp-config';
import { TEMPLATE_BY_EVENT } from './email-template-defaults';
import { EmailTemplatesService } from './email-templates.service';
import { WahaClient } from './waha.client';

type DeliveryEvent = {
  eventKey: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Prisma.JsonValue;
};

const CUSTOMER_EVENTS = ['PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'BOOKING_EXPIRED'];

@Injectable()
export class NotificationDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
    private readonly emailSettings: EmailSettingsService,
    private readonly templates: EmailTemplatesService,
    private readonly waha: WahaClient,
  ) {}

  async dispatch(event: DeliveryEvent) {
    const payload = this.objectPayload(event.payload);
    const bookingId =
      this.stringValue(payload.bookingId) ??
      (event.aggregateType === 'Booking' ? event.aggregateId : undefined);
    const booking = bookingId
      ? await this.prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            invoice: true,
            // Only money actually received, for the paid and remaining amounts in the email.
            payments: {
              where: { status: { in: ['PAID_DP', 'PAID_FULL'] } },
              select: { amount: true },
            },
          },
        })
      : null;
    const settings = await this.emailSettings.getCurrent();
    const customerEvent = CUSTOMER_EVENTS.includes(event.eventType);
    // Studio-side events (new booking, payment proof) are never emailed; only customers get email.
    // The studio is told in the admin panel, and over WhatsApp when that channel is enabled.
    const recipients = customerEvent
      ? { email: booking?.customerEmail, phone: booking?.customerPhone }
      : { email: undefined, phone: this.adminChatId() };
    if (!customerEvent && !(recipients.phone && this.waha.isEnabled())) return;

    const subject = this.subject(event.eventType, booking?.bookingCode);
    const message = this.message(event.eventType, booking, payload);
    let handled = 0;

    if (recipients.email) {
      const request = {
        dedupeKey: `${event.eventKey}:email`,
        to: recipients.email,
        subject,
        text: message,
        bookingId: booking?.id,
      };
      const skipReason = this.emailSkipReason(event.eventType, settings);
      const templateCode = TEMPLATE_BY_EVENT[event.eventType];
      // Queued mail is sent (and retried) by the email worker; the dedupe key makes a retry of
      // this whole event, for example because WhatsApp failed, not send the email twice.
      if (skipReason) {
        await this.emailQueue.skip(request, skipReason);
      } else if (customerEvent && templateCode && booking) {
        const composed = await this.templates.compose(templateCode, {
          booking,
          rejectionReason: this.stringValue(payload.reason),
        });
        if (composed.status === 'inactive') {
          await this.emailQueue.skip({ ...request, templateCode }, composed.reason);
        } else {
          await this.emailQueue.enqueue({
            ...request,
            subject: composed.subject,
            text: composed.text,
            html: composed.html,
            templateCode,
            attachments: [
              ...composed.attachments,
              // The invoice email also carries the invoice itself as a PDF.
              ...(templateCode === 'INVOICE_OFFICIAL' && booking.invoice
                ? [{ type: 'invoice-pdf' as const, invoiceId: booking.invoice.id }]
                : []),
            ],
          });
        }
      } else {
        await this.emailQueue.enqueue(request);
      }
      handled += 1;
    }

    if (recipients.phone && this.waha.isEnabled()) {
      await this.waha.sendText(recipients.phone, message);
      handled += 1;
    }

    if (handled === 0) {
      throw new Error(`No notification delivery channel configured for ${event.eventType}`);
    }
  }

  /** Why an email that would otherwise go out is held back; null when it should be sent. */
  emailSkipReason(eventType: string, settings: { enabled: boolean; autoSendInvoice: boolean }) {
    if (!settings.enabled) return 'Pengiriman email dinonaktifkan di pengaturan';
    const smtp = readSmtpConfig();
    if (!smtp.configured) {
      return `SMTP belum dikonfigurasi di environment: ${smtp.missing.join(', ')}`;
    }
    if (eventType === 'PAYMENT_VERIFIED' && !settings.autoSendInvoice) {
      return 'Kirim invoice otomatis dimatikan';
    }
    return null;
  }

  private adminChatId() {
    return process.env.WAHA_ADMIN_CHAT_ID;
  }

  private subject(eventType: string, bookingCode?: string) {
    const suffix = bookingCode ? ` - ${bookingCode}` : '';
    const subjects: Record<string, string> = {
      BOOKING_CREATED: 'Booking baru masuk',
      PAYMENT_PROOF_SUBMITTED: 'Bukti pembayaran baru',
      PAYMENT_VERIFIED: 'Pembayaran terverifikasi',
      PAYMENT_REJECTED: 'Pembayaran perlu diperbaiki',
      BOOKING_EXPIRED: 'Booking kedaluwarsa',
    };
    return `${subjects[eventType] ?? 'Notifikasi booking'}${suffix}`;
  }

  private message(
    eventType: string,
    booking: {
      bookingCode: string;
      customerName: string;
      sessionDate: Date;
      timeSlot: string;
      invoice: { invoiceNumber: string } | null;
    } | null,
    payload: Record<string, Prisma.JsonValue>,
  ) {
    const code = booking?.bookingCode ?? this.stringValue(payload.bookingCode) ?? '-';
    const name = booking?.customerName ?? this.stringValue(payload.customerName) ?? '-';
    const reason = this.stringValue(payload.reason);
    const invoice = booking?.invoice?.invoiceNumber ?? this.stringValue(payload.invoiceNumber);
    const lines = [`Booking ${code}`, `Nama: ${name}`];

    if (eventType === 'PAYMENT_VERIFIED') {
      lines.push('Pembayaran berhasil diverifikasi.');
      if (invoice) lines.push(`Invoice: ${invoice}`);
    } else if (eventType === 'PAYMENT_REJECTED') {
      lines.push(`Pembayaran ditolak${reason ? `: ${reason}` : '.'}`);
    } else if (eventType === 'BOOKING_EXPIRED') {
      lines.push('Booking kedaluwarsa karena pembayaran tidak diterima tepat waktu.');
    } else if (eventType === 'PAYMENT_PROOF_SUBMITTED') {
      lines.push('Bukti pembayaran manual menunggu verifikasi admin.');
    } else {
      lines.push('Booking baru menunggu proses pembayaran.');
    }

    return lines.join('\n');
  }

  private objectPayload(value: Prisma.JsonValue) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, Prisma.JsonValue>)
      : {};
  }

  private stringValue(value: Prisma.JsonValue | undefined) {
    return typeof value === 'string' ? value : undefined;
  }
}
