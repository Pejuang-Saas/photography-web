import { Injectable } from '@nestjs/common';
import { BookingStatus, PaymentPlan, PaymentStatus, Prisma } from '@prisma/client';
import { OutboxService } from '../../outbox/outbox.service';

type GatewayPayment = Prisma.PaymentGetPayload<{ include: { booking: true } }>;

@Injectable()
export class GatewayPaymentStateService {
  constructor(private readonly outbox: OutboxService) {}

  async settle(
    tx: Prisma.TransactionClient,
    payment: GatewayPayment,
    metadata: Prisma.InputJsonValue,
  ) {
    if (payment.status === PaymentStatus.PAID_DP || payment.status === PaymentStatus.PAID_FULL) {
      return;
    }
    const paymentStatus =
      payment.plan === PaymentPlan.FULL ? PaymentStatus.PAID_FULL : PaymentStatus.PAID_DP;
    const claimedPayment = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: { notIn: [PaymentStatus.PAID_DP, PaymentStatus.PAID_FULL] },
      },
      data: { status: paymentStatus, paidAt: new Date(), metadata },
    });
    if (claimedPayment.count !== 1) return;

    const claimedBooking = await tx.booking.updateMany({
      where: {
        id: payment.bookingId,
        status: BookingStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.UNPAID,
      },
      data: { status: BookingStatus.CONFIRMED, paymentStatus },
    });
    if (claimedBooking.count !== 1) {
      // The money has arrived but the booking can no longer be confirmed (the slot was already
      // released, or the booking is already paid). Throwing would make the provider retry forever
      // and hide the payment, so keep it recorded as paid and ask an admin to resolve it.
      await tx.notification.create({
        data: {
          bookingId: payment.bookingId,
          type: 'SYSTEM',
          title: 'Pembayaran masuk, booking tidak aktif',
          message: `Pembayaran ${payment.booking.bookingCode} sebesar ${payment.amount} diterima, tetapi booking berstatus ${payment.booking.status}. Perlu refund atau konfirmasi manual.`,
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'UNMATCHED_GATEWAY_PAYMENT',
          entity: 'Payment',
          entityId: payment.id,
          metadata: {
            bookingId: payment.bookingId,
            bookingStatus: payment.booking.status,
            amount: payment.amount,
          },
        },
      });
      return;
    }

    const invoice = await tx.invoice.upsert({
      where: { bookingId: payment.bookingId },
      create: {
        bookingId: payment.bookingId,
        invoiceNumber: `INV-${payment.booking.bookingCode}`,
        amount: payment.amount,
      },
      update: { amount: payment.amount, status: 'ISSUED' },
    });
    await tx.notification.create({
      data: {
        bookingId: payment.bookingId,
        type: 'PAYMENT_VERIFIED',
        title: 'Pembayaran Gateway Berhasil',
        message: `Invoice ${invoice.invoiceNumber} telah diterbitkan.`,
      },
    });
    await this.outbox.createInTransaction(tx, {
      eventKey: `payment-verified:${payment.id}`,
      eventType: 'PAYMENT_VERIFIED',
      aggregateType: 'Payment',
      aggregateId: payment.id,
      payload: {
        bookingId: payment.bookingId,
        paymentId: payment.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: payment.booking.customerName,
        customerEmail: payment.booking.customerEmail,
      },
    });
  }

  async fail(
    tx: Prisma.TransactionClient,
    payment: GatewayPayment,
    reason: string,
    metadata: Prisma.InputJsonValue,
  ) {
    await tx.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.UNPAID },
      data: { status: PaymentStatus.REJECTED, rejectionReason: reason, metadata },
    });
    // The booking stays UNPAID so the customer can retry; settle() requires UNPAID, and the
    // expiration sweep releases the slot if no attempt succeeds.
  }
}
