import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { EmailSettingsService } from './email-settings.service';
import { WahaClient } from './waha.client';

type DeliveryEvent = {
  eventKey: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Prisma.JsonValue;
};

@Injectable()
export class NotificationDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly emailSettings: EmailSettingsService,
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
          include: { invoice: true },
        })
      : null;
    const settings = await this.emailSettings.getCurrent();
    const customerEvent = ['PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'BOOKING_EXPIRED'].includes(
      event.eventType,
    );
    const recipients = customerEvent
      ? { email: booking?.customerEmail, phone: booking?.customerPhone }
      : {
          email: settings.adminNotificationEmail ?? undefined,
          phone: this.adminChatId(),
        };

    const subject = this.subject(event.eventType, booking?.bookingCode);
    const message = this.message(event.eventType, booking, payload);
    let delivered = 0;

    if (
      recipients.email &&
      settings.enabled &&
      !(event.eventType === 'PAYMENT_VERIFIED' && !settings.autoSendInvoice)
    ) {
      await this.email.send(recipients.email, subject, message, event.eventKey);
      delivered += 1;
    }

    if (recipients.phone && this.waha.isEnabled()) {
      await this.waha.sendText(recipients.phone, message);
      delivered += 1;
    }

    if (delivered === 0) {
      throw new Error(`No notification delivery channel configured for ${event.eventType}`);
    }
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
