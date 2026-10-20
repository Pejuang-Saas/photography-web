import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, PaymentStatus, PaymentPlan, Prisma } from '@prisma/client';
import { randomInt } from 'crypto';
import { AddOnsService } from '../add-ons/add-ons.service';
import { PackagesService } from '../packages/packages.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentSettingsService } from '../payments/payment-settings.service';
import { QueuesService } from '../queues/queues.service';
import { OutboxService } from '../outbox/outbox.service';
import { StorageService } from '../storage/storage.service';
import {
  assertSameIdempotencyPayload,
  hashIdempotencyPayload,
  requireIdempotencyKey,
} from '../common/idempotency';
import { paymentDeadline } from '../common/payment-window';
import { findSlot, occupied, overlaps, slotsForDuration } from '../common/session-slots';
import { CreateBookingDto } from './dto/booking.dto';

/** What a booking shows of each add-on it took. */
const ADD_ON_LINE = {
  name: true,
  unitLabel: true,
  unitPrice: true,
  quantity: true,
  extraMinutes: true,
  subtotal: true,
} as const;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly packagesService: PackagesService,
    private readonly paymentSettings: PaymentSettingsService,
    private readonly queues: QueuesService,
    private readonly outbox: OutboxService,
    private readonly storage: StorageService,
    private readonly addOns: AddOnsService,
  ) {}

  async create(dto: CreateBookingDto, rawIdempotencyKey?: string) {
    const idempotencyKey = requireIdempotencyKey(rawIdempotencyKey);
    const idempotencyHash = hashIdempotencyPayload(dto);
    const previous = await this.prisma.booking.findUnique({
      where: { idempotencyKey },
      include: { addOns: true },
    });
    if (previous) {
      assertSameIdempotencyPayload(previous.idempotencyHash, idempotencyHash);
      return previous;
    }

    // A booking already made is returned above; a new one waits until the studio opens reservations.
    const studio = await this.prisma.studioSetting.findUnique({
      where: { id: 'default' },
      select: { reservationsOpen: true },
    });
    if (studio && !studio.reservationsOpen) {
      throw new ForbiddenException({
        message: 'Reservasi online sedang ditutup. Silakan hubungi studio.',
        errorCode: 'RESERVATIONS_CLOSED',
      });
    }

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

    // The slot must be one of the studio's and fit the package: a 60-minute package does not take a
    // 90-minute window.
    const slot = findSlot(dto.timeSlot);
    if (
      !slot ||
      !slotsForDuration(packageItem.durationMinutes).some((s) => s.label === slot.label)
    ) {
      throw new BadRequestException('Jam sesi ini tidak tersedia untuk paket yang dipilih');
    }

    // Add-ons are priced here, from the add-ons as they are now; the client only names them.
    const lines = await this.addOns.price(dto.addOns, packageItem);
    const addOnsTotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const extraMinutes = lines.reduce((sum, line) => sum + line.extraMinutes, 0);

    const totalAmount = packageItem.price + addOnsTotal;
    const requiredAmount =
      dto.paymentPlan === PaymentPlan.DP_50 ? Math.ceil(totalAmount / 2) : totalAmount;
    const reservationKey = `${dateOnly}:${slot.label}`;
    const expiresAt = paymentDeadline(settings.activeMode);

    try {
      const booking = await this.prisma.$transaction(async (tx) => {
        // One booking per date at a time, so two customers cannot take overlapping times together.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${dateOnly}))`;
        await this.assertFree(tx, sessionDate, slot.label, extraMinutes);

        const booking = await tx.booking.create({
          data: {
            bookingCode: await this.generateBookingCode(tx),
            customerName: dto.customerName.trim(),
            customerPhone: dto.customerPhone.replace(/\D/g, ''),
            customerEmail: dto.customerEmail.trim().toLowerCase(),
            notes: dto.notes?.trim(),
            idempotencyKey,
            idempotencyHash,
            packageId: packageItem.id,
            packageName: packageItem.name,
            packagePrice: packageItem.price,
            totalAmount,
            paymentMode: settings.activeMode,
            paymentPlan: dto.paymentPlan,
            requiredAmount,
            sessionDate,
            timeSlot: slot.label,
            extraMinutes,
            reservationKey,
            expiresAt,
            addOns: {
              create: lines.map(({ addOnId, ...line }) => ({ addOnId, ...line })),
            },
          },
          include: { package: true, addOns: true },
        });

        await tx.notification.create({
          data: {
            bookingId: booking.id,
            type: 'BOOKING_NEW',
            title: 'Booking Baru Masuk',
            message: `${booking.bookingCode} dari ${booking.customerName} menunggu pembayaran.`,
          },
        });
        await this.outbox.createInTransaction(tx, {
          eventKey: `booking-created:${booking.id}`,
          eventType: 'BOOKING_CREATED',
          aggregateType: 'Booking',
          aggregateId: booking.id,
          payload: {
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            paymentMode: booking.paymentMode,
          },
        });
        return booking;
      });
      void this.queues.scheduleBookingExpiration(booking.id, expiresAt).catch((error) => {
        console.error(`Could not schedule expiration for booking ${booking.bookingCode}`, error);
      });
      return booking;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const previous = await this.prisma.booking.findUnique({
          where: { idempotencyKey },
          include: { addOns: true },
        });
        if (previous) {
          assertSameIdempotencyPayload(previous.idempotencyHash, idempotencyHash);
          return previous;
        }
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
        addOns: true,
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
        addOns: true,
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
        extraMinutes: true,
        addOns: { select: ADD_ON_LINE },
        invoice: { select: { invoiceNumber: true, amount: true, status: true, issuedAt: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  /**
   * What the checkout page needs to redraw itself after a refresh. The booking id is an unguessable
   * UUID and already the credential for the payment endpoints, so it is safe to key this on; the
   * booking code is not (6 digits). No contact details or proof images are returned.
   */
  async getResume(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        bookingCode: true,
        customerName: true,
        packageId: true,
        packageName: true,
        packagePrice: true,
        totalAmount: true,
        requiredAmount: true,
        paymentMode: true,
        paymentPlan: true,
        status: true,
        paymentStatus: true,
        sessionDate: true,
        timeSlot: true,
        extraMinutes: true,
        addOns: { select: ADD_ON_LINE },
        expiresAt: true,
        createdAt: true,
        payments: {
          where: { method: 'GATEWAY', status: PaymentStatus.UNPAID },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { metadata: true },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const { payments, ...rest } = booking;
    return {
      ...rest,
      // Lets the client count down from the server's clock instead of the visitor's.
      serverTime: new Date().toISOString(),
      // Reusing the open pay page avoids creating a second gateway transaction after a refresh.
      gatewayRedirectUrl:
        booking.status === BookingStatus.PENDING_PAYMENT
          ? this.redirectUrlFrom(payments[0]?.metadata)
          : null,
    };
  }

  private redirectUrlFrom(metadata: Prisma.JsonValue | undefined) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
    const url = (metadata as { redirectUrl?: unknown }).redirectUrl;
    return typeof url === 'string' ? url : null;
  }

  /**
   * The times of one day that can still be booked for a package, with any add-on time counted in:
   * a slot is free when nothing already booked overlaps what this booking would occupy.
   */
  async availability(date: string, packageId: string, extraMinutes = 0) {
    const packageItem = await this.packagesService.requireActive(packageId);
    const sessionDate = this.parseSessionDate(date);
    const taken = await this.takenOn(this.prisma, sessionDate);

    return {
      date: date.slice(0, 10),
      durationMinutes: packageItem.durationMinutes,
      slots: slotsForDuration(packageItem.durationMinutes).map((slot) => {
        const wanted = occupied(slot.label, extraMinutes)!;
        return {
          slot: slot.label,
          minutes: slot.minutes,
          available: !taken.some((range) => overlaps(wanted, range)),
        };
      }),
    };
  }

  /** The time every live booking of a day occupies; unpaid ones past their deadline do not count. */
  private async takenOn(db: Pick<PrismaService, 'booking'>, sessionDate: Date) {
    const day = await db.booking.findMany({
      where: { sessionDate, reservationKey: { not: null } },
      select: { timeSlot: true, extraMinutes: true, status: true, expiresAt: true },
    });
    const now = new Date();
    return day
      .filter(
        (booking) =>
          !(
            booking.status === BookingStatus.PENDING_PAYMENT &&
            booking.expiresAt &&
            booking.expiresAt < now
          ),
      )
      .flatMap((booking) => {
        const range = occupied(booking.timeSlot, booking.extraMinutes);
        return range ? [range] : [];
      });
  }

  /**
   * Throws when something already booked overlaps the time this booking would occupy. An unpaid
   * booking past its deadline is released on the way, so its slot can be taken again.
   */
  private async assertFree(
    tx: Prisma.TransactionClient,
    sessionDate: Date,
    label: string,
    extraMinutes: number,
  ) {
    const wanted = occupied(label, extraMinutes)!;
    const day = await tx.booking.findMany({
      where: { sessionDate, reservationKey: { not: null } },
      select: { id: true, timeSlot: true, extraMinutes: true, status: true, expiresAt: true },
    });
    for (const booking of day) {
      if (
        booking.status === BookingStatus.PENDING_PAYMENT &&
        booking.expiresAt &&
        booking.expiresAt < new Date()
      ) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { reservationKey: null, status: BookingStatus.CANCELLED },
        });
        continue;
      }
      const range = occupied(booking.timeSlot, booking.extraMinutes);
      if (range && overlaps(wanted, range)) {
        throw new ConflictException('The selected session slot is no longer available');
      }
    }
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
