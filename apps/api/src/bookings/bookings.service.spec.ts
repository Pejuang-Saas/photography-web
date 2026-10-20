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

describe('BookingsService.create: slots and add-ons', () => {
  const pkg = (durationMinutes: number) => ({
    id: 'pkg',
    name: 'Lite - Basic',
    category: 'Lite',
    price: 350_000,
    durationMinutes,
  });
  const dto = (extra: Record<string, unknown> = {}) => ({
    packageId: 'pkg',
    customerName: 'Budi',
    customerPhone: '081234567890',
    customerEmail: 'budi@example.com',
    sessionDate: '2999-11-01',
    timeSlot: '08:30 - 09:30',
    paymentPlan: 'DP_50' as const,
    ...extra,
  });

  function build(
    options: { duration?: number; day?: Array<Record<string, unknown>>; lines?: unknown[] } = {},
  ) {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      booking: {
        findMany: jest.fn().mockResolvedValue(options.day ?? []),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn(async ({ data }: any) => ({ id: 'b1', bookingCode: 'KYA-1', ...data })),
      },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      booking: { findUnique: jest.fn().mockResolvedValue(null), findMany: tx.booking.findMany },
      $transaction: jest.fn(async (work: (t: typeof tx) => unknown) => work(tx)),
    };
    const addOns = { price: jest.fn().mockResolvedValue(options.lines ?? []) };
    const service = new BookingsService(
      prisma as never,
      { requireActive: jest.fn().mockResolvedValue(pkg(options.duration ?? 60)) } as never,
      {
        getCurrent: jest.fn().mockResolvedValue({ activeMode: 'GATEWAY', allowDownPayment: true }),
      } as never,
      { scheduleBookingExpiration: jest.fn().mockResolvedValue(undefined) } as never,
      { createInTransaction: jest.fn().mockResolvedValue(undefined) } as never,
      {} as never,
      addOns as never,
    );
    return { service, tx, addOns };
  }

  const line = (subtotal: number, extraMinutes: number) => ({
    addOnId: 'a1',
    name: 'Tambahan waktu',
    unitLabel: '30 menit',
    unitPrice: subtotal,
    quantity: 1,
    extraMinutes,
    subtotal,
  });

  it('adds the add-ons to the total and the deposit, and keeps a copy of each line', async () => {
    const { service, tx } = build({ lines: [line(100_000, 30), line(50_000, 0)] });

    await service.create(
      dto({ addOns: [{ addOnId: 'a1', quantity: 1 }] }) as never,
      'key-12345678',
    );

    const data = tx.booking.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      packagePrice: 350_000,
      totalAmount: 500_000,
      requiredAmount: 250_000,
      extraMinutes: 30,
    });
    expect(data.addOns.create).toHaveLength(2);
    expect(data.addOns.create[0]).toMatchObject({ name: 'Tambahan waktu', subtotal: 100_000 });
  });

  it('prices from the server: the client sends only ids and quantities', async () => {
    const { service, addOns } = build();
    const input = dto({ addOns: [{ addOnId: 'a1', quantity: 2 }] }) as unknown as {
      addOns: unknown[];
    };

    await service.create(input as never, 'key-12345678');

    expect(addOns.price).toHaveBeenCalledWith(
      input.addOns,
      expect.objectContaining({ category: 'Lite' }),
    );
  });

  it('takes no add-ons when none are chosen', async () => {
    const { service, tx } = build();

    await service.create(dto() as never, 'key-12345678');

    expect(tx.booking.create.mock.calls[0][0].data).toMatchObject({
      totalAmount: 350_000,
      extraMinutes: 0,
    });
  });

  it('refuses a time that is not one of the studio slots', async () => {
    const { service } = build();

    await expect(
      service.create(dto({ timeSlot: '14:00 - 15:00' }) as never, 'key-12345678'),
    ).rejects.toThrow('tidak tersedia untuk paket');
  });

  it('refuses a 90-minute window for a 60-minute package', async () => {
    const { service } = build({ duration: 60 });

    await expect(
      service.create(dto({ timeSlot: '13:00 - 14:30' }) as never, 'key-12345678'),
    ).rejects.toThrow('tidak tersedia untuk paket');
  });

  it('refuses a slot an earlier booking has stretched into with extra time', async () => {
    const { service } = build({
      day: [
        {
          id: 'x',
          timeSlot: '08:30 - 09:30',
          extraMinutes: 30,
          status: 'CONFIRMED',
          expiresAt: null,
        },
      ],
    });

    await expect(
      service.create(dto({ timeSlot: '09:30 - 10:30' }) as never, 'key-12345678'),
    ).rejects.toThrow('no longer available');
  });

  it('refuses extra time that would run into the next booking', async () => {
    const { service } = build({
      lines: [line(100_000, 30)],
      day: [
        {
          id: 'x',
          timeSlot: '09:30 - 10:30',
          extraMinutes: 0,
          status: 'CONFIRMED',
          expiresAt: null,
        },
      ],
    });

    await expect(
      service.create(dto({ addOns: [{ addOnId: 'a1', quantity: 1 }] }) as never, 'key-12345678'),
    ).rejects.toThrow('no longer available');
  });

  it('lets back-to-back sessions share a boundary', async () => {
    const { service, tx } = build({
      day: [
        {
          id: 'x',
          timeSlot: '09:30 - 10:30',
          extraMinutes: 0,
          status: 'CONFIRMED',
          expiresAt: null,
        },
      ],
    });

    await service.create(dto() as never, 'key-12345678');

    expect(tx.booking.create).toHaveBeenCalled();
  });

  it('frees an unpaid booking past its deadline instead of blocking on it', async () => {
    const { service, tx } = build({
      day: [
        {
          id: 'stale',
          timeSlot: '08:30 - 09:30',
          extraMinutes: 0,
          status: 'PENDING_PAYMENT',
          expiresAt: new Date('2020-01-01'),
        },
      ],
    });

    await service.create(dto() as never, 'key-12345678');

    expect(tx.booking.update).toHaveBeenCalledWith({
      where: { id: 'stale' },
      data: { reservationKey: null, status: 'CANCELLED' },
    });
    expect(tx.booking.create).toHaveBeenCalled();
  });
});

describe('BookingsService.availability', () => {
  function build(day: Array<Record<string, unknown>>, duration = 60) {
    const prisma = { booking: { findMany: jest.fn().mockResolvedValue(day) } };
    const service = new BookingsService(
      prisma as never,
      { requireActive: jest.fn().mockResolvedValue({ durationMinutes: duration }) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return service;
  }
  const booked = (timeSlot: string, extraMinutes = 0, extra: Record<string, unknown> = {}) => ({
    timeSlot,
    extraMinutes,
    status: 'CONFIRMED',
    expiresAt: null,
    ...extra,
  });

  it('lists only the slots of the package length, marking those already taken', async () => {
    const result = await build([booked('09:30 - 10:30')]).availability('2999-11-01', 'pkg');

    expect(result.durationMinutes).toBe(60);
    expect(result.slots.map((s) => [s.slot, s.available])).toEqual([
      ['08:30 - 09:30', true],
      ['09:30 - 10:30', false],
      ['10:30 - 11:30', true],
    ]);
  });

  it('counts the time an add-on would add, so the slot right before a booking is not offered', async () => {
    const result = await build([booked('09:30 - 10:30')]).availability('2999-11-01', 'pkg', 30);

    // Extra time runs on past the end of the window, so only the slot before is squeezed out.
    expect(result.slots.find((s) => s.slot === '08:30 - 09:30')?.available).toBe(false);
    expect(result.slots.find((s) => s.slot === '10:30 - 11:30')?.available).toBe(true);
  });

  it('does not count an unpaid booking past its deadline', async () => {
    const result = await build([
      booked('08:30 - 09:30', 0, { status: 'PENDING_PAYMENT', expiresAt: new Date('2020-01-01') }),
    ]).availability('2999-11-01', 'pkg');

    expect(result.slots[0].available).toBe(true);
  });

  it('rejects a date that is not a date', async () => {
    await expect(build([]).availability('besok', 'pkg')).rejects.toThrow('Invalid session date');
  });
});
