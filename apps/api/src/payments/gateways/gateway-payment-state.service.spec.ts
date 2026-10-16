import { BookingStatus, PaymentPlan, PaymentStatus } from '@prisma/client';

jest.mock('../../outbox/outbox.service', () => ({ OutboxService: class OutboxService {} }));

import { GatewayPaymentStateService } from './gateway-payment-state.service';

function setup(bookingStatus: BookingStatus, claimedBooking: number) {
  const payment = {
    id: 'payment-1',
    bookingId: 'booking-1',
    plan: PaymentPlan.FULL,
    amount: 650000,
    status: PaymentStatus.UNPAID,
    booking: {
      bookingCode: 'KYA-2026-123456',
      status: bookingStatus,
      customerName: 'Customer',
      customerEmail: 'customer@example.com',
    },
  };
  const tx = {
    payment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    booking: { updateMany: jest.fn().mockResolvedValue({ count: claimedBooking }) },
    invoice: { upsert: jest.fn().mockResolvedValue({ invoiceNumber: 'INV-1' }) },
    notification: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const outbox = { createInTransaction: jest.fn() };
  return { service: new GatewayPaymentStateService(outbox as never), payment, tx, outbox };
}

describe('GatewayPaymentStateService.settle', () => {
  it('confirms a booking that is still waiting for payment', async () => {
    const { service, payment, tx, outbox } = setup(BookingStatus.PENDING_PAYMENT, 1);

    await service.settle(tx as never, payment as never, {});

    expect(tx.invoice.upsert).toHaveBeenCalled();
    expect(outbox.createInTransaction).toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('keeps a payment that arrives after the slot expired, and tells an admin instead of failing', async () => {
    const { service, payment, tx, outbox } = setup(BookingStatus.EXPIRED, 0);

    await expect(service.settle(tx as never, payment as never, {})).resolves.toBeUndefined();

    expect(tx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: 'booking-1',
        type: 'SYSTEM',
        message: expect.stringContaining('EXPIRED'),
      }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'UNMATCHED_GATEWAY_PAYMENT', entityId: 'payment-1' }),
    });
    // No invoice or confirmation event for a booking that is not active.
    expect(tx.invoice.upsert).not.toHaveBeenCalled();
    expect(outbox.createInTransaction).not.toHaveBeenCalled();
  });
});
