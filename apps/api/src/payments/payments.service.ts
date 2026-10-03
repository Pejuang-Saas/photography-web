import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  GatewayProvider,
  PaymentMode,
  PaymentPlan,
  PaymentStatus,
  Prisma,
  StorageBucket,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { StorageCleanupService } from '../storage/storage-cleanup.service';
import {
  assertSameIdempotencyPayload,
  hashIdempotencyPayload,
  requireIdempotencyKey,
} from '../common/idempotency';
import { PaymentSettingsService } from './payment-settings.service';
import { OutboxService } from '../outbox/outbox.service';
import {
  ConfirmGatewayPaymentDto,
  RejectPaymentDto,
  SubmitManualPaymentDto,
  VerifyPaymentDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly storageCleanup: StorageCleanupService,
    private readonly paymentSettings: PaymentSettingsService,
    private readonly outbox: OutboxService,
  ) {}

  async submitManualPayment(
    id: string,
    dto: SubmitManualPaymentDto,
    file: Express.Multer.File,
    rawIdempotencyKey?: string,
  ) {
    const idempotencyKey = requireIdempotencyKey(rawIdempotencyKey);
    const idempotencyHash = hashIdempotencyPayload({
      bookingId: id,
      ...dto,
      file: {
        size: file.size,
        mimetype: file.mimetype,
        checksum: hashIdempotencyPayload(file.buffer.toString('base64')),
      },
    });
    const previous = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (previous) {
      assertSameIdempotencyPayload(previous.idempotencyHash, idempotencyHash);
      return { bookingId: id, status: previous.status, payment: previous };
    }

    const booking = await this.requireBooking(id);
    if (booking.paymentMode !== PaymentMode.MANUAL) {
      throw new BadRequestException('This booking is not configured for manual payment');
    }
    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new ConflictException('This booking is no longer waiting for payment');
    }
    const account = await this.prisma.manualPaymentAccount.findFirst({
      where: { id: dto.manualAccountId, isActive: true },
    });
    if (!account) throw new BadRequestException('Selected payment account is not active');

    const upload = await this.storage.uploadPaymentProof(file);
    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        const current = await tx.booking.findUnique({ where: { id } });
        if (!current || current.status !== BookingStatus.PENDING_PAYMENT) {
          throw new ConflictException('This booking is no longer waiting for payment');
        }
        const claimedBooking = await tx.booking.updateMany({
          where: {
            id,
            status: BookingStatus.PENDING_PAYMENT,
            paymentStatus: PaymentStatus.UNPAID,
          },
          data: {
            status: BookingStatus.PENDING_VERIFICATION,
            paymentStatus: PaymentStatus.WAITING_CONFIRMATION,
          },
        });
        if (claimedBooking.count !== 1) {
          throw new ConflictException('This booking is no longer waiting for payment');
        }

        const createdPayment = await tx.payment.create({
          data: {
            bookingId: id,
            manualAccountId: account.id,
            method: 'BANK_TRANSFER',
            plan: current.paymentPlan,
            amount: dto.amount,
            status: PaymentStatus.WAITING_CONFIRMATION,
            senderName: dto.senderName.trim(),
            idempotencyKey,
            idempotencyHash,
            proof: {
              create: {
                storageKey: upload.key,
                filename: upload.filename,
                mimeType: upload.mimeType,
                size: upload.size,
              },
            },
          },
        });
        await tx.notification.create({
          data: {
            bookingId: id,
            type: 'PAYMENT_PROOF',
            title: 'Bukti Pembayaran Baru',
            message: `${current.bookingCode} menunggu verifikasi pembayaran manual.`,
          },
        });
        await this.outbox.createInTransaction(tx, {
          eventKey: `payment-proof-submitted:${createdPayment.id}`,
          eventType: 'PAYMENT_PROOF_SUBMITTED',
          aggregateType: 'Payment',
          aggregateId: createdPayment.id,
          payload: {
            bookingId: id,
            paymentId: createdPayment.id,
            customerName: current.customerName,
            customerEmail: current.customerEmail,
          },
        });
        return createdPayment;
      });

      return { bookingId: id, status: PaymentStatus.WAITING_CONFIRMATION, payment };
    } catch (error) {
      await this.storageCleanup.removeOrQueue(StorageBucket.PRIVATE, upload.key, error);
      if (this.isUniqueViolation(error)) {
        const previous = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
        if (previous) {
          assertSameIdempotencyPayload(previous.idempotencyHash, idempotencyHash);
          return { bookingId: id, status: previous.status, payment: previous };
        }
      }
      throw error;
    }
  }

  async confirmGatewayPayment(
    id: string,
    dto: ConfirmGatewayPaymentDto,
    rawIdempotencyKey?: string,
  ) {
    const idempotencyKey = requireIdempotencyKey(rawIdempotencyKey);
    const idempotencyHash = hashIdempotencyPayload({ bookingId: id, ...dto });
    const previous = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (previous) {
      assertSameIdempotencyPayload(previous.idempotencyHash, idempotencyHash);
      return { bookingId: id, status: previous.status, payment: previous };
    }

    const booking = await this.requireBooking(id);
    const settings = await this.paymentSettings.getCurrent();
    if (
      booking.paymentMode !== PaymentMode.GATEWAY ||
      settings.activeMode !== PaymentMode.GATEWAY
    ) {
      throw new BadRequestException('Gateway payment is not active for this booking');
    }
    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new ConflictException('This booking is no longer waiting for payment');
    }

    return this.prisma
      .$transaction(async (tx) => {
        const current = await tx.booking.findUnique({ where: { id } });
        if (!current || current.status !== BookingStatus.PENDING_PAYMENT) {
          throw new ConflictException('This booking is no longer waiting for payment');
        }
        const paymentStatus =
          current.paymentPlan === PaymentPlan.FULL
            ? PaymentStatus.PAID_FULL
            : PaymentStatus.PAID_DP;
        const claimedBooking = await tx.booking.updateMany({
          where: {
            id,
            status: BookingStatus.PENDING_PAYMENT,
            paymentStatus: PaymentStatus.UNPAID,
          },
          data: { status: BookingStatus.CONFIRMED, paymentStatus },
        });
        if (claimedBooking.count !== 1) {
          throw new ConflictException('This booking is no longer waiting for payment');
        }
        const payment = await tx.payment.create({
          data: {
            bookingId: id,
            method: 'GATEWAY',
            provider: settings.gatewayProvider ?? GatewayProvider.MOCK,
            plan: current.paymentPlan,
            amount: current.requiredAmount,
            status: paymentStatus,
            externalReference: dto.externalReference,
            idempotencyKey,
            idempotencyHash,
            paidAt: new Date(),
          },
        });
        const invoice = await tx.invoice.create({
          data: {
            bookingId: id,
            invoiceNumber: `INV-${current.bookingCode}`,
            amount: current.requiredAmount,
          },
        });
        await tx.notification.create({
          data: {
            bookingId: id,
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
            bookingId: id,
            paymentId: payment.id,
            invoiceNumber: invoice.invoiceNumber,
            customerName: current.customerName,
            customerEmail: current.customerEmail,
          },
        });
        return { bookingId: id, payment, invoice, status: BookingStatus.CONFIRMED };
      })
      .catch(async (error) => {
        if (this.isUniqueViolation(error)) {
          const previous = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
          if (previous) {
            assertSameIdempotencyPayload(previous.idempotencyHash, idempotencyHash);
            return { bookingId: id, status: previous.status, payment: previous };
          }
          if (dto.externalReference) {
            const existingExternalPayment = await this.prisma.payment.findUnique({
              where: { externalReference: dto.externalReference },
            });
            if (existingExternalPayment) {
              throw new ConflictException(
                'This gateway payment reference has already been processed',
              );
            }
          }
        }
        throw error;
      });
  }

  async verifyPayment(id: string, dto: VerifyPaymentDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking || booking.status !== BookingStatus.PENDING_VERIFICATION) {
        throw new ConflictException('This booking is not waiting for verification');
      }
      if (dto.paymentPlan === PaymentPlan.FULL && dto.amount < booking.totalAmount) {
        throw new BadRequestException('Full payment amount cannot be less than the booking total');
      }
      if (dto.paymentPlan === PaymentPlan.DP_50 && dto.amount < booking.requiredAmount) {
        throw new BadRequestException('DP amount is below the required amount');
      }

      const payment = await tx.payment.findFirst({
        where: { bookingId: id, status: PaymentStatus.WAITING_CONFIRMATION },
        orderBy: { createdAt: 'desc' },
      });
      if (!payment) throw new NotFoundException('Waiting payment not found');

      const paymentStatus =
        dto.paymentPlan === PaymentPlan.FULL ? PaymentStatus.PAID_FULL : PaymentStatus.PAID_DP;
      const claimedPayment = await tx.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.WAITING_CONFIRMATION },
        data: {
          plan: dto.paymentPlan,
          amount: dto.amount,
          status: paymentStatus,
          verifiedById: actorId,
          verifiedAt: new Date(),
          paidAt: new Date(),
        },
      });
      if (claimedPayment.count !== 1) {
        throw new ConflictException('This payment has already been processed');
      }
      const claimedBooking = await tx.booking.updateMany({
        where: {
          id,
          status: BookingStatus.PENDING_VERIFICATION,
          paymentStatus: PaymentStatus.WAITING_CONFIRMATION,
        },
        data: {
          paymentPlan: dto.paymentPlan,
          requiredAmount: dto.amount,
          status: BookingStatus.CONFIRMED,
          paymentStatus,
          verifiedById: actorId,
          verifiedAt: new Date(),
        },
      });
      if (claimedBooking.count !== 1) {
        throw new ConflictException('This booking has already been processed');
      }
      const updatedPayment = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      const invoice = await tx.invoice.upsert({
        where: { bookingId: id },
        create: {
          bookingId: id,
          invoiceNumber: `INV-${booking.bookingCode}`,
          amount: dto.amount,
        },
        update: { amount: dto.amount, status: 'ISSUED' },
      });
      const updatedBooking = await tx.booking.findUniqueOrThrow({ where: { id } });
      await tx.notification.create({
        data: {
          bookingId: id,
          type: 'PAYMENT_VERIFIED',
          title: 'Pembayaran Dikonfirmasi',
          message: `Invoice ${invoice.invoiceNumber} telah diterbitkan untuk ${booking.customerName}.`,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'VERIFY_PAYMENT',
          entity: 'Booking',
          entityId: id,
          metadata: { paymentId: payment.id, amount: dto.amount, paymentPlan: dto.paymentPlan },
        },
      });
      await this.outbox.createInTransaction(tx, {
        eventKey: `payment-verified:${payment.id}`,
        eventType: 'PAYMENT_VERIFIED',
        aggregateType: 'Payment',
        aggregateId: payment.id,
        payload: {
          bookingId: id,
          paymentId: payment.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
        },
      });
      return { booking: updatedBooking, payment: updatedPayment, invoice };
    });
  }

  async rejectPayment(id: string, dto: RejectPaymentDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking || booking.status !== BookingStatus.PENDING_VERIFICATION) {
        throw new ConflictException('This booking is not waiting for verification');
      }
      const payment = await tx.payment.findFirst({
        where: { bookingId: id, status: PaymentStatus.WAITING_CONFIRMATION },
        orderBy: { createdAt: 'desc' },
      });
      if (!payment) throw new NotFoundException('Waiting payment not found');

      const claimedPayment = await tx.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.WAITING_CONFIRMATION },
        data: {
          status: PaymentStatus.REJECTED,
          rejectionReason: dto.reason,
          verifiedById: actorId,
          verifiedAt: new Date(),
        },
      });
      if (claimedPayment.count !== 1) {
        throw new ConflictException('This payment has already been processed');
      }
      const claimedBooking = await tx.booking.updateMany({
        where: {
          id,
          status: BookingStatus.PENDING_VERIFICATION,
          paymentStatus: PaymentStatus.WAITING_CONFIRMATION,
        },
        data: {
          status: BookingStatus.REJECTED,
          paymentStatus: PaymentStatus.REJECTED,
          reservationKey: null,
        },
      });
      if (claimedBooking.count !== 1) {
        throw new ConflictException('This booking has already been processed');
      }
      const rejectedPayment = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      const rejectedBooking = await tx.booking.findUniqueOrThrow({ where: { id } });
      await tx.notification.create({
        data: {
          bookingId: id,
          type: 'PAYMENT_REJECTED',
          title: 'Pembayaran Ditolak',
          message: `Bukti pembayaran ${booking.bookingCode} ditolak: ${dto.reason}`,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'REJECT_PAYMENT',
          entity: 'Booking',
          entityId: id,
          metadata: { paymentId: payment.id, reason: dto.reason },
        },
      });
      await this.outbox.createInTransaction(tx, {
        eventKey: `payment-rejected:${payment.id}`,
        eventType: 'PAYMENT_REJECTED',
        aggregateType: 'Payment',
        aggregateId: payment.id,
        payload: {
          bookingId: id,
          paymentId: payment.id,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          reason: dto.reason,
        },
      });
      return { booking: rejectedBooking, payment: rejectedPayment };
    });
  }

  private async requireBooking(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  private isUniqueViolation(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
