import { BookingStatus } from '@prisma/client';

jest.mock('../outbox/outbox.service', () => ({ OutboxService: class OutboxService {} }));

import { BookingExpirationService } from './booking-expiration.service';

function setup() {
  const prisma = {
    booking: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(),
  };
  const service = new BookingExpirationService(prisma as never, {} as never);
  return { service, prisma };
}

describe('BookingExpirationService', () => {
  it('only sweeps bookings still waiting for payment, never ones awaiting admin verification', async () => {
    const { service, prisma } = setup();

    await service.sweep();

    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: BookingStatus.PENDING_PAYMENT }),
      }),
    );
  });

  it('expire() targets unpaid bookings only', async () => {
    const { service, prisma } = setup();
    const tx = {
      booking: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await service.expire('booking-1');

    expect(tx.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'booking-1', status: BookingStatus.PENDING_PAYMENT }),
      }),
    );
  });
});
