import { BookingStatus, PaymentStatus } from '@prisma/client';

jest.mock('../outbox/outbox.service', () => ({ OutboxService: class OutboxService {} }));
jest.mock('../queues/queues.service', () => ({ QueuesService: class QueuesService {} }));
jest.mock('../storage/storage.service', () => ({ StorageService: class StorageService {} }));

import { BookingsService } from './bookings.service';

const base = {
  id: 'booking-1',
  bookingCode: 'KYA-2026-123456',
  customerName: 'Customer',
  packageId: 'package-1',
  packageName: 'Squad',
  packagePrice: 650000,
  totalAmount: 650000,
  requiredAmount: 325000,
  paymentMode: 'GATEWAY',
  paymentPlan: 'DP_50',
  status: BookingStatus.PENDING_PAYMENT as BookingStatus,
  paymentStatus: PaymentStatus.UNPAID,
  sessionDate: new Date('2026-11-01'),
  timeSlot: '08:30 - 09:30',
  expiresAt: new Date('2026-10-17T11:00:00.000Z'),
  createdAt: new Date('2026-10-17T10:00:00.000Z'),
  payments: [] as Array<{ metadata: unknown }>,
};

function setup(booking: typeof base | null) {
  const prisma = { booking: { findUnique: jest.fn().mockResolvedValue(booking) } };
  const service = new BookingsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, prisma };
}

describe('BookingsService.getResume', () => {
  it('returns what the checkout needs, with server time and without contact details', async () => {
    const { service } = setup({ ...base });

    const result = await service.getResume('booking-1');

    expect(result).toMatchObject({
      id: 'booking-1',
      bookingCode: 'KYA-2026-123456',
      requiredAmount: 325000,
      status: BookingStatus.PENDING_PAYMENT,
      gatewayRedirectUrl: null,
    });
    expect(Date.parse(result.serverTime)).not.toBeNaN();
    expect(result).not.toHaveProperty('customerEmail');
    expect(result).not.toHaveProperty('customerPhone');
    expect(result).not.toHaveProperty('payments');
  });

  it('only looks at the latest unpaid gateway payment', async () => {
    const { service, prisma } = setup({ ...base });

    await service.getResume('booking-1');

    expect(prisma.booking.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          payments: expect.objectContaining({
            where: { method: 'GATEWAY', status: PaymentStatus.UNPAID },
            take: 1,
          }),
        }),
      }),
    );
  });

  it('hands back the open gateway pay page so a refresh does not start a second transaction', async () => {
    const { service } = setup({
      ...base,
      payments: [{ metadata: { token: 't', redirectUrl: 'https://pay.test/abc' } }],
    });

    await expect(service.getResume('booking-1')).resolves.toMatchObject({
      gatewayRedirectUrl: 'https://pay.test/abc',
    });
  });

  it('drops the pay page once the booking is no longer waiting for payment', async () => {
    const { service } = setup({
      ...base,
      status: BookingStatus.EXPIRED,
      payments: [{ metadata: { redirectUrl: 'https://pay.test/abc' } }],
    });

    await expect(service.getResume('booking-1')).resolves.toMatchObject({
      gatewayRedirectUrl: null,
    });
  });

  it('ignores malformed payment metadata', async () => {
    const { service } = setup({ ...base, payments: [{ metadata: ['not', 'an', 'object'] }] });

    await expect(service.getResume('booking-1')).resolves.toMatchObject({
      gatewayRedirectUrl: null,
    });
  });

  it('answers 404 for an unknown booking', async () => {
    const { service } = setup(null);

    await expect(service.getResume('missing')).rejects.toThrow('Booking not found');
  });
});
