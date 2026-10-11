import { BookingStatus, GatewayProvider, PaymentMode, PaymentStatus } from '@prisma/client';

jest.mock('../outbox/outbox.service', () => ({ OutboxService: class OutboxService {} }));
jest.mock('../storage/storage.service', () => ({ StorageService: class StorageService {} }));
jest.mock('../storage/storage-cleanup.service', () => ({
  StorageCleanupService: class StorageCleanupService {},
}));

import { PaymentsService } from './payments.service';

const booking = {
  id: 'booking-1',
  bookingCode: 'KYA-2026-123456',
  paymentMode: PaymentMode.MANUAL,
  status: BookingStatus.PENDING_PAYMENT,
  paymentPlan: 'FULL',
  customerName: 'Customer',
  customerEmail: 'customer@example.com',
};

function setup() {
  const tx = {
    booking: {
      findUnique: jest.fn().mockResolvedValue(booking),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    payment: { create: jest.fn().mockResolvedValue({ id: 'payment-1' }) },
    notification: { create: jest.fn() },
  };
  const prisma = {
    payment: { findUnique: jest.fn().mockResolvedValue(null) },
    booking: { findUnique: jest.fn().mockResolvedValue(booking) },
    manualPaymentAccount: { findFirst: jest.fn().mockResolvedValue({ id: 'account-1' }) },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const storage = {
    uploadPaymentProof: jest
      .fn()
      .mockResolvedValue({ key: 'k', filename: 'f.jpg', mimeType: 'image/jpeg', size: 3 }),
  };
  const paymentSettings = { getCurrent: jest.fn() };
  const outbox = { createInTransaction: jest.fn() };
  const service = new PaymentsService(
    prisma as never,
    storage as never,
    { removeOrQueue: jest.fn() } as never,
    paymentSettings as never,
    outbox as never,
    {} as never,
    {} as never,
  );
  return { service, tx, prisma, paymentSettings };
}

const file = { buffer: Buffer.from('abc'), size: 3, mimetype: 'image/jpeg' } as Express.Multer.File;

describe('PaymentsService', () => {
  it('stops the expiry clock once a manual payment proof is submitted', async () => {
    const { service, tx } = setup();

    await service.submitManualPayment(
      'booking-1',
      { manualAccountId: 'account-1', senderName: 'Sender', amount: 100000 },
      file,
      'idem-key-12345',
    );

    expect(tx.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: BookingStatus.PENDING_VERIFICATION,
          paymentStatus: PaymentStatus.WAITING_CONFIRMATION,
          expiresAt: null,
        }),
      }),
    );
  });

  describe('mock gateway confirmation', () => {
    const original = process.env.NODE_ENV;
    afterAll(() => {
      process.env.NODE_ENV = original;
    });

    function setupGateway() {
      const ctx = setup();
      ctx.prisma.booking.findUnique.mockResolvedValue({
        ...booking,
        paymentMode: PaymentMode.GATEWAY,
      });
      ctx.paymentSettings.getCurrent.mockResolvedValue({
        activeMode: PaymentMode.GATEWAY,
        gatewayProvider: GatewayProvider.MOCK,
      });
      return ctx;
    }

    it('is refused in production, even when the MOCK provider is configured', async () => {
      process.env.NODE_ENV = 'production';
      const { service, tx } = setupGateway();

      await expect(
        service.confirmGatewayPayment('booking-1', {}, 'idem-key-12345'),
      ).rejects.toThrow('Mock gateway payments are disabled in production');
      expect(tx.booking.updateMany).not.toHaveBeenCalled();
    });

    it('still works outside production', async () => {
      process.env.NODE_ENV = 'development';
      const { service, tx } = setupGateway();
      Object.assign(tx, {
        invoice: { create: jest.fn().mockResolvedValue({ invoiceNumber: 'INV-1' }) },
      });

      await expect(
        service.confirmGatewayPayment('booking-1', {}, 'idem-key-12345'),
      ).resolves.toMatchObject({ status: BookingStatus.CONFIRMED });
    });
  });
});
