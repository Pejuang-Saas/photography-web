import { Injectable, Logger } from '@nestjs/common';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../outbox/outbox.service';

@Injectable()
export class BookingExpirationService {
  private readonly logger = new Logger(BookingExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async sweep() {
    const expired = await this.prisma.booking.findMany({
      where: {
        status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_VERIFICATION] },
        expiresAt: { lte: new Date() },
      },
      select: { id: true, bookingCode: true },
      orderBy: { expiresAt: 'asc' },
      take: 100,
    });

    for (const booking of expired) {
      try {
        await this.expire(booking.id, booking.bookingCode);
      } catch {
        // Keep processing the batch; the failed booking will be retried by the next sweep.
      }
    }
  }

  async expire(id: string, bookingCode?: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const result = await tx.booking.updateMany({
          where: {
            id,
            status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_VERIFICATION] },
            expiresAt: { lte: new Date() },
          },
          data: {
            status: BookingStatus.EXPIRED,
            paymentStatus: PaymentStatus.EXPIRED,
            reservationKey: null,
          },
        });

        if (result.count !== 1) return;

        await tx.payment.updateMany({
          where: { bookingId: id, status: PaymentStatus.WAITING_CONFIRMATION },
          data: { status: PaymentStatus.EXPIRED },
        });
        await tx.notification.create({
          data: {
            bookingId: id,
            type: 'BOOKING_EXPIRED',
            title: 'Booking Expired',
            message: `Booking ${bookingCode ?? id} expired dan slot jadwal telah dilepas.`,
          },
        });
        await tx.auditLog.create({
          data: {
            action: 'EXPIRE_BOOKING',
            entity: 'Booking',
            entityId: id,
            metadata: { bookingCode },
          },
        });
        await this.outbox.createInTransaction(tx, {
          eventKey: `booking-expired:${id}`,
          eventType: 'BOOKING_EXPIRED',
          aggregateType: 'Booking',
          aggregateId: id,
          payload: { bookingId: id, bookingCode },
        });
      });
    } catch (error) {
      this.logger.error(
        `Could not expire booking ${bookingCode ?? id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
