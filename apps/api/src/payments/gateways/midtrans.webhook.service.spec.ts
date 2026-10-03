import { BookingStatus, GatewayProvider, PaymentPlan, PaymentStatus } from '@prisma/client';

jest.mock('../../outbox/outbox.service', () => ({
  OutboxService: class OutboxService {},
}));

import { MidtransWebhookService } from './midtrans.webhook.service';

const webhook = {
  transactionStatus: 'settlement',
  transactionId: 'tx-1',
  statusCode: '200',
  signatureKey: 'valid',
  orderId: 'ORDER-1',
  grossAmount: '50000.00',
  fraudStatus: 'accept',
};

function setup() {
  const payment = {
    id: 'payment-1',
    bookingId: 'booking-1',
    provider: GatewayProvider.MIDTRANS,
    externalReference: 'ORDER-1',
    plan: PaymentPlan.DP_50,
    amount: 50000,
    status: PaymentStatus.UNPAID,
    booking: {
      id: 'booking-1',
      bookingCode: 'BK-1',
      customerName: 'Customer',
      customerEmail: 'customer@example.com',
      totalAmount: 100000,
      requiredAmount: 50000,
    },
  };
  const tx = {
    gatewayWebhookEvent: {
      create: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findFirst: jest.fn().mockResolvedValue(payment),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    booking: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    invoice: {
      upsert: jest.fn().mockResolvedValue({ invoiceNumber: 'INV-BK-1' }),
    },
    notification: {
      create: jest.fn(),
    },
  };
  const prisma = {
    gatewayWebhookEvent: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };
  const midtrans = { verifySignature: jest.fn().mockResolvedValue(true) };
  const outbox = { createInTransaction: jest.fn() };
  const service = new MidtransWebhookService(prisma as never, midtrans as never, outbox as never);

  return { service, prisma, tx, midtrans, outbox };
}

describe('MidtransWebhookService', () => {
  it('settles a valid payment atomically and emits invoice notification', async () => {
    const { service, tx, outbox } = setup();

    await expect(service.handle(webhook)).resolves.toEqual({ status: 'processed' });

    expect(tx.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: PaymentStatus.PAID_DP }),
      }),
    );
    expect(tx.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.PAID_DP },
      }),
    );
    expect(tx.invoice.upsert).toHaveBeenCalled();
    expect(outbox.createInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ eventType: 'PAYMENT_VERIFIED' }),
    );
  });

  it('returns success without reprocessing an identical callback', async () => {
    const { service, prisma, tx } = setup();
    prisma.gatewayWebhookEvent.findUnique.mockResolvedValue({ status: 'PROCESSED' });

    await expect(service.handle(webhook)).resolves.toEqual({ status: 'already_processed' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a callback with a mismatched amount', async () => {
    const { service, tx } = setup();

    await expect(service.handle({ ...webhook, grossAmount: '49999.00' })).rejects.toThrow(
      'Midtrans amount does not match the booking amount',
    );
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
    expect(tx.booking.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a callback with an invalid signature before opening a transaction', async () => {
    const { service, prisma, midtrans } = setup();
    midtrans.verifySignature.mockResolvedValue(false);

    await expect(service.handle(webhook)).rejects.toThrow('Invalid Midtrans signature');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
