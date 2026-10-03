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
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PaymentSettingsService } from './payment-settings.service';
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
    private readonly paymentSettings: PaymentSettingsService,
  ) {}

  async submitManualPayment(id: string, dto: SubmitManualPaymentDto, file: Express.Multer.File) {
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
        const createdPayment = await tx.payment.create({
          data: {
            bookingId: id,
            manualAccountId: account.id,
            method: 'BANK_TRANSFER',
            plan: current.paymentPlan,
            amount: dto.amount,
            status: PaymentStatus.WAITING_CONFIRMATION,
            senderName: dto.senderName.trim(),
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
        await tx.booking.update({
          where: { id },
          data: {
            status: BookingStatus.PENDING_VERIFICATION,
            paymentStatus: PaymentStatus.WAITING_CONFIRMATION,
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
        return createdPayment;
      });

      return { bookingId: id, status: PaymentStatus.WAITING_CONFIRMATION, payment };
    } catch (error) {
      await this.storage.deletePaymentProof(upload.key).catch(() => undefined);
      throw error;
    }
  }

  async confirmGatewayPayment(id: string, dto: ConfirmGatewayPaymentDto) {
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

    return this.prisma.$transaction(async (tx) => {
      const paymentStatus =
        booking.paymentPlan === PaymentPlan.FULL ? PaymentStatus.PAID_FULL : PaymentStatus.PAID_DP;
      const payment = await tx.payment.create({
        data: {
          bookingId: id,
          method: 'GATEWAY',
          provider: settings.gatewayProvider ?? GatewayProvider.MOCK,
          plan: booking.paymentPlan,
          amount: booking.requiredAmount,
          status: paymentStatus,
          externalReference: dto.externalReference,
          paidAt: new Date(),
        },
      });
      const invoice = await tx.invoice.create({
        data: {
          bookingId: id,
          invoiceNumber: `INV-${booking.bookingCode}`,
          amount: booking.requiredAmount,
        },
      });
      await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.CONFIRMED, paymentStatus },
      });
      await tx.notification.create({
        data: {
          bookingId: id,
          type: 'PAYMENT_VERIFIED',
          title: 'Pembayaran Gateway Berhasil',
          message: `Invoice ${invoice.invoiceNumber} telah diterbitkan.`,
        },
      });
      return { bookingId: id, payment, invoice, status: BookingStatus.CONFIRMED };
    });
  }

  async verifyPayment(id: string, dto: VerifyPaymentDto, actorId: string) {
    const booking = await this.requireBooking(id);
    if (booking.status !== BookingStatus.PENDING_VERIFICATION) {
      throw new ConflictException('This booking is not waiting for verification');
    }
    if (dto.paymentPlan === PaymentPlan.FULL && dto.amount < booking.totalAmount) {
      throw new BadRequestException('Full payment amount cannot be less than the booking total');
    }
    if (dto.paymentPlan === PaymentPlan.DP_50 && dto.amount < booking.requiredAmount) {
      throw new BadRequestException('DP amount is below the required amount');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { bookingId: id, status: PaymentStatus.WAITING_CONFIRMATION },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) throw new NotFoundException('Waiting payment not found');

    return this.prisma.$transaction(async (tx) => {
      const paymentStatus =
        dto.paymentPlan === PaymentPlan.FULL ? PaymentStatus.PAID_FULL : PaymentStatus.PAID_DP;
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          plan: dto.paymentPlan,
          amount: dto.amount,
          status: paymentStatus,
          verifiedById: actorId,
          verifiedAt: new Date(),
          paidAt: new Date(),
        },
      });
      const invoice = await tx.invoice.upsert({
        where: { bookingId: id },
        create: {
          bookingId: id,
          invoiceNumber: `INV-${booking.bookingCode}`,
          amount: dto.amount,
        },
        update: { amount: dto.amount, status: 'ISSUED' },
      });
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          paymentPlan: dto.paymentPlan,
          requiredAmount: dto.amount,
          status: BookingStatus.CONFIRMED,
          paymentStatus,
          verifiedById: actorId,
          verifiedAt: new Date(),
        },
      });
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
      return { booking: updatedBooking, payment: updatedPayment, invoice };
    });
  }

  async rejectPayment(id: string, dto: RejectPaymentDto, actorId: string) {
    const booking = await this.requireBooking(id);
    if (booking.status !== BookingStatus.PENDING_VERIFICATION) {
      throw new ConflictException('This booking is not waiting for verification');
    }
    const payment = await this.prisma.payment.findFirst({
      where: { bookingId: id, status: PaymentStatus.WAITING_CONFIRMATION },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) throw new NotFoundException('Waiting payment not found');

    return this.prisma.$transaction(async (tx) => {
      const rejectedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REJECTED,
          rejectionReason: dto.reason,
          verifiedById: actorId,
          verifiedAt: new Date(),
        },
      });
      const rejectedBooking = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.REJECTED,
          paymentStatus: PaymentStatus.REJECTED,
          reservationKey: null,
        },
      });
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
      return { booking: rejectedBooking, payment: rejectedPayment };
    });
  }

  private async requireBooking(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }
}
