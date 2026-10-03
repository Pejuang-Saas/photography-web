import { GatewayProvider, PaymentPlan, PaymentStatus } from '@prisma/client';

jest.mock('../../outbox/outbox.service', () => ({
  OutboxService: class OutboxService {},
}));
jest.mock('./gateway-payment-state.service', () => ({
  GatewayPaymentStateService: class GatewayPaymentStateService {},
}));

import { XenditWebhookService } from './xendit.webhook.service';

const webhook = {
  externalId: 'ORDER-1',
  id: 'invoice-1',
  status: 'PAID',
  amount: 50000,
};

function setup() {
  const payment = {
    id: 'payment-1',
    bookingId: 'booking-1',
    provider: GatewayProvider.XENDIT,
    externalReference: 'ORDER-1',
    plan: PaymentPlan.DP_50,
    amount: 50000,
    status: PaymentStatus.UNPAID,
    booking: { id: 'booking-1' },
  };
  const tx = {
    gatewayWebhookEvent: { create: jest.fn(), update: jest.fn() },
    payment: { findFirst: jest.fn().mockResolvedValue(payment) },
  };
  const prisma = {
    gatewayWebhookEvent: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };
  const xendit = { verifyCallbackToken: jest.fn().mockResolvedValue(true) };
  const state = { settle: jest.fn(), fail: jest.fn() };
  const service = new XenditWebhookService(prisma as never, xendit as never, state as never);
  return { service, prisma, tx, xendit, state };
}

describe('XenditWebhookService', () => {
  it('settles a paid invoice after callback token validation', async () => {
    const { service, state } = setup();

    await expect(service.handle(webhook, 'callback-token', 'webhook-1')).resolves.toEqual({
      status: 'processed',
    });
    expect(state.settle).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'payment-1' }),
      { invoiceId: 'invoice-1', status: 'PAID' },
    );
  });

  it('does not process a duplicate webhook id', async () => {
    const { service, prisma, state } = setup();
    prisma.gatewayWebhookEvent.findUnique.mockResolvedValue({ status: 'PROCESSED' });

    await expect(service.handle(webhook, 'callback-token', 'webhook-1')).resolves.toEqual({
      status: 'already_processed',
    });
    expect(state.settle).not.toHaveBeenCalled();
  });

  it('rejects an invalid callback token before opening a transaction', async () => {
    const { service, prisma, xendit } = setup();
    xendit.verifyCallbackToken.mockResolvedValue(false);

    await expect(service.handle(webhook, 'forged-token')).rejects.toThrow(
      'Invalid Xendit callback token',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
