import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { BookingStatus, GatewayProvider, PaymentStatus, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { OutboxService } from '../../outbox/outbox.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MidtransWebhookDto } from '../dto/payment.dto';
import { MidtransClient } from './midtrans.client';

@Injectable()
export class MidtransWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly midtrans: MidtransClient,
    private readonly outbox: OutboxService,
  ) {}

  async handle(dto: MidtransWebhookDto) {
    if (!(await this.midtrans.verifySignature(dto))) {
      throw new BadRequestException('Invalid Midtrans signature');
    }

    const eventKey = createHash('sha256')
      .update(
        JSON.stringify({
          orderId: dto.orderId,
          transactionId: dto.transactionId,
          transactionStatus: dto.transactionStatus,
          statusCode: dto.statusCode,
          grossAmount: dto.grossAmount,
          fraudStatus: dto.fraudStatus ?? null,
        }),
      )
      .digest('hex');
    const existing = await this.prisma.gatewayWebhookEvent.findUnique({ where: { eventKey } });
    if (existing?.status === 'PROCESSED') return { status: 'already_processed' };

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.gatewayWebhookEvent.create({
          data: {
            provider: GatewayProvider.MIDTRANS,
            eventKey,
            transactionId: dto.transactionId,
            orderId: dto.orderId,
            payload: dto as unknown as Prisma.InputJsonValue,
          },
        });

        const payment = await tx.payment.findFirst({
          where: { provider: GatewayProvider.MIDTRANS, externalReference: dto.orderId },
          include: { booking: true },
        });
        if (!payment) throw new BadRequestException('Unknown Midtrans order_id');

        const grossAmount = this.parseAmount(dto.grossAmount);
        const expectedAmount =
          payment.plan === 'FULL' ? payment.booking.totalAmount : payment.booking.requiredAmount;
        if (grossAmount !== expectedAmount) {
          throw new BadRequestException('Midtrans amount does not match the booking amount');
        }

        if (this.isSuccessful(dto)) {
          await this.markSuccessful(tx, payment, dto);
        } else if (this.isFailed(dto)) {
          await this.markFailed(tx, payment, dto);
        }

        await tx.gatewayWebhookEvent.update({
          where: { eventKey },
          data: { status: 'PROCESSED', processedAt: new Date(), error: null },
        });
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) return { status: 'already_processed' };
      throw error;
    }

    return { status: 'processed' };
  }

  private async markSuccessful(
    tx: Prisma.TransactionClient,
    payment: Prisma.PaymentGetPayload<{ include: { booking: true } }>,
    dto: MidtransWebhookDto,
  ) {
    if (payment.status === PaymentStatus.PAID_DP || payment.status === PaymentStatus.PAID_FULL) {
      return;
    }
    const paymentStatus = payment.plan === 'FULL' ? PaymentStatus.PAID_FULL : PaymentStatus.PAID_DP;
    const claimedPayment = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: { notIn: [PaymentStatus.PAID_DP, PaymentStatus.PAID_FULL] },
      },
      data: {
        status: paymentStatus,
        paidAt: new Date(),
        metadata: { transactionId: dto.transactionId, status: dto.transactionStatus },
      },
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
      throw new ConflictException('Booking is no longer waiting for gateway payment');
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

  private async markFailed(
    tx: Prisma.TransactionClient,
    payment: Prisma.PaymentGetPayload<{ include: { booking: true } }>,
    dto: MidtransWebhookDto,
  ) {
    await tx.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.UNPAID },
      data: {
        status: PaymentStatus.REJECTED,
        rejectionReason: `Midtrans transaction ${dto.transactionStatus}`,
        metadata: { transactionId: dto.transactionId, status: dto.transactionStatus },
      },
    });
    await tx.booking.updateMany({
      where: {
        id: payment.bookingId,
        status: BookingStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.UNPAID,
      },
      data: { paymentStatus: PaymentStatus.REJECTED },
    });
  }

  private isSuccessful(dto: MidtransWebhookDto) {
    return (
      dto.transactionStatus === 'settlement' ||
      (dto.transactionStatus === 'capture' && dto.fraudStatus === 'accept') ||
      dto.transactionStatus === 'authorize'
    );
  }

  private isFailed(dto: MidtransWebhookDto) {
    return ['deny', 'cancel', 'expire', 'failure'].includes(dto.transactionStatus);
  }

  private parseAmount(value: string) {
    const amount = Number(value);
    if (!Number.isSafeInteger(amount) || amount < 1) {
      throw new BadRequestException('Invalid Midtrans gross_amount');
    }
    return amount;
  }

  private isUniqueViolation(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
