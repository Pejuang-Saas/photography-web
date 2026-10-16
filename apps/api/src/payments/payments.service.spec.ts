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
    payment: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'payment-9' }),
    },
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
  const midtrans = {
    createSnapIntent: jest.fn().mockResolvedValue({ token: 't', redirectUrl: 'https://pay.test' }),
  };
  const xendit = {
    createInvoice: jest
      .fn()
      .mockResolvedValue({ invoiceId: 'inv-1', invoiceUrl: 'https://invoice.test' }),
  };
  const service = new PaymentsService(
    prisma as never,
    storage as never,
    { removeOrQueue: jest.fn() } as never,
    paymentSettings as never,
    outbox as never,
    midtrans as never,
    xendit as never,
  );
  return { service, tx, prisma, paymentSettings, midtrans, xendit };
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

  describe('payment window', () => {
    const proof = { manualAccountId: 'account-1', senderName: 'Sender', amount: 100000 };
    const expired = new Date(Date.now() - 1_000);

    it('rejects a proof that arrives after the deadline, before the expiry job has run', async () => {
      const { service, prisma, tx } = setup();
      prisma.booking.findUnique.mockResolvedValue({ ...booking, expiresAt: expired });

      await expect(
        service.submitManualPayment('booking-1', proof, file, 'idem-key-12345'),
      ).rejects.toThrow('Waktu pembayaran sudah habis');
      expect(tx.payment.create).not.toHaveBeenCalled();
    });

    it('rejects a gateway intent after the deadline', async () => {
      const { service, prisma, paymentSettings, midtrans } = setup();
      prisma.booking.findUnique.mockResolvedValue({
        ...booking,
        paymentMode: PaymentMode.GATEWAY,
        expiresAt: expired,
      });
      paymentSettings.getCurrent.mockResolvedValue({
        activeMode: PaymentMode.GATEWAY,
        gatewayProvider: GatewayProvider.MIDTRANS,
      });

      await expect(service.createGatewayIntent('booking-1', 'idem-key-12345')).rejects.toThrow(
        'Waktu pembayaran sudah habis',
      );
      expect(midtrans.createSnapIntent).not.toHaveBeenCalled();
    });

    it('hands the remaining time to the provider so the pay page expires with the slot', async () => {
      const { service, prisma, paymentSettings, midtrans, xendit } = setup();
      const base = {
        ...booking,
        paymentMode: PaymentMode.GATEWAY,
        expiresAt: new Date(Date.now() + 30 * 60_000 - 5_000),
        packageName: 'Squad',
        requiredAmount: 100000,
        customerPhone: '081234567890',
      };
      prisma.booking.findUnique.mockResolvedValue(base);

      paymentSettings.getCurrent.mockResolvedValue({
        activeMode: PaymentMode.GATEWAY,
        gatewayProvider: GatewayProvider.MIDTRANS,
      });
      await service.createGatewayIntent('booking-1', 'idem-key-midtrans');
      expect(midtrans.createSnapIntent).toHaveBeenCalledWith(
        expect.objectContaining({ expiresInMinutes: 30 }),
      );

      paymentSettings.getCurrent.mockResolvedValue({
        activeMode: PaymentMode.GATEWAY,
        gatewayProvider: GatewayProvider.XENDIT,
      });
      await service.createGatewayIntent('booking-1', 'idem-key-xendit');
      const { durationSeconds } = xendit.createInvoice.mock.calls[0][0];
      expect(durationSeconds).toBeGreaterThan(29 * 60);
      expect(durationSeconds).toBeLessThanOrEqual(30 * 60);
    });
  });
});
