import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, PaymentMode, PaymentPlan, Prisma } from '@prisma/client';
import { randomInt } from 'crypto';
import { PackagesService } from '../packages/packages.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentSettingsService } from '../payments/payment-settings.service';
import { StorageService } from '../storage/storage.service';
import { CreateBookingDto } from './dto/booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly packagesService: PackagesService,
    private readonly paymentSettings: PaymentSettingsService,
    private readonly storage: StorageService,
  ) {}

  async create(dto: CreateBookingDto) {
    const packageItem = await this.packagesService.requireActive(dto.packageId);
    const settings = await this.paymentSettings.getCurrent();
    const sessionDate = this.parseSessionDate(dto.sessionDate);
    const dateOnly = dto.sessionDate.slice(0, 10);

    if (dateOnly < new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('Session date cannot be in the past');
    }
    if (dto.paymentPlan === PaymentPlan.DP_50 && !settings.allowDownPayment) {
      throw new BadRequestException('Down payment is currently disabled');
    }

    const totalAmount = packageItem.price;
    const requiredAmount =
      dto.paymentPlan === PaymentPlan.DP_50 ? Math.ceil(totalAmount / 2) : totalAmount;
    const reservationKey = `${dateOnly}:${dto.timeSlot.trim()}`;
    const expiresAt = new Date(
      Date.now() + (settings.activeMode === PaymentMode.MANUAL ? 24 : 1) * 60 * 60 * 1000,
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.booking.findUnique({ where: { reservationKey } });
        if (existing) {
          if (
            existing.status === BookingStatus.PENDING_PAYMENT &&
            existing.expiresAt &&
            existing.expiresAt < new Date()
          ) {
            await tx.booking.update({
              where: { id: existing.id },
              data: { reservationKey: null, status: BookingStatus.CANCELLED },
            });
          } else {
            throw new ConflictException('The selected session slot is no longer available');
          }
        }

        const booking = await tx.booking.create({
          data: {
            bookingCode: await this.generateBookingCode(tx),
            customerName: dto.customerName.trim(),
            customerPhone: dto.customerPhone.replace(/\D/g, ''),
            customerEmail: dto.customerEmail.trim().toLowerCase(),
            notes: dto.notes?.trim(),
            packageId: packageItem.id,
            packageName: packageItem.name,
            packagePrice: packageItem.price,
            totalAmount,
            paymentMode: settings.activeMode,
            paymentPlan: dto.paymentPlan,
            requiredAmount,
            sessionDate,
            timeSlot: dto.timeSlot.trim(),
            reservationKey,
            expiresAt,
          },
          include: { package: true },
        });

        await tx.notification.create({
          data: {
            bookingId: booking.id,
            type: 'BOOKING_NEW',
            title: 'Booking Baru Masuk',
            message: `${booking.bookingCode} dari ${booking.customerName} menunggu pembayaran.`,
          },
        });
        return booking;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('The selected session slot is no longer available');
      }
      throw error;
    }
  }

  listAdmin(status?: BookingStatus) {
    return this.prisma.booking.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        package: true,
        invoice: true,
        payments: { orderBy: { createdAt: 'desc' }, include: { proof: true, manualAccount: true } },
      },
    });
  }

  async getAdmin(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        package: true,
        invoice: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          include: { proof: true, manualAccount: true },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const payments = await Promise.all(
      booking.payments.map(async (payment) => ({
        ...payment,
        proof: payment.proof
          ? {
              id: payment.proof.id,
              filename: payment.proof.filename,
              mimeType: payment.proof.mimeType,
              size: payment.proof.size,
              url: await this.storage.createPaymentProofUrl(payment.proof.storageKey),
            }
          : null,
      })),
    );
    return { ...booking, payments };
  }

  async getPublic(bookingCode: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode },
      select: {
        bookingCode: true,
        customerName: true,
        packageName: true,
        totalAmount: true,
        requiredAmount: true,
        paymentMode: true,
        paymentPlan: true,
        status: true,
        paymentStatus: true,
        sessionDate: true,
        timeSlot: true,
        invoice: { select: { invoiceNumber: true, amount: true, status: true, issuedAt: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  private parseSessionDate(value: string) {
    const parsed = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid session date');
    return parsed;
  }

  private async generateBookingCode(tx: Prisma.TransactionClient) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `KYA-${new Date().getUTCFullYear()}-${randomInt(100000, 1_000_000)}`;
      const exists = await tx.booking.findUnique({
        where: { bookingCode: code },
        select: { id: true },
      });
      if (!exists) return code;
    }
    throw new ConflictException('Could not generate a unique booking code');
  }

  private isUniqueViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
