import { WhatsappEventMessagesService } from './whatsapp-event-messages.service';

const booking = {
  id: 'b1',
  bookingCode: 'KYA-2026-123456',
  customerName: 'Anisa',
  customerEmail: 'anisa@example.test',
  customerPhone: '081234567890',
  packageName: 'Solo Kebaya',
  sessionDate: new Date('2026-11-01T00:00:00.000Z'),
  timeSlot: '09:00 - 10:00',
  paymentPlan: 'FULL',
  totalAmount: 450000,
  invoice: { id: 'inv-1', invoiceNumber: 'INV-1' },
  payments: [{ amount: 450000 }],
};

function setup(template: Record<string, unknown> | null) {
  const prisma = { whatsappTemplate: { findUnique: jest.fn().mockResolvedValue(template) } };
  const studio = { getCurrent: jest.fn().mockResolvedValue(null) };
  const config = {
    get: jest.fn((key: string) =>
      key === 'WEB_URL' ? 'https://kayastory.id' : 'https://api.kayastory.id',
    ),
  };
  return {
    prisma,
    service: new WhatsappEventMessagesService(prisma as never, studio as never, config as never),
  };
}

describe('WhatsappEventMessagesService', () => {
  it('fills the template tied to the event from the booking', async () => {
    const { service, prisma } = setup({
      name: 'Pembayaran Terverifikasi',
      isActive: true,
      body: ' Halo Kak {customer_name}, {booking_code} lunas. Invoice: {invoice_url} ',
    });

    const result = await service.compose('PAYMENT_VERIFIED', { booking: booking as never });

    expect(prisma.whatsappTemplate.findUnique).toHaveBeenCalledWith({
      where: { code: 'PAYMENT_VERIFIED' },
    });
    expect(result).toEqual({
      status: 'ok',
      templateCode: 'PAYMENT_VERIFIED',
      text: 'Halo Kak Anisa, KYA-2026-123456 lunas. Invoice: https://api.kayastory.id/public/invoices/inv-1/pdf',
    });
  });

  it('puts the rejection reason in', async () => {
    const { service } = setup({ name: 'T', isActive: true, body: 'Alasan: {rejection_reason}' });

    const result = await service.compose('PAYMENT_REJECTED', {
      booking: booking as never,
      rejectionReason: 'Nominal kurang',
    });

    expect(result).toMatchObject({ status: 'ok', text: 'Alasan: Nominal kurang' });
  });

  it('reports a switched-off template so nothing is sent', async () => {
    const { service } = setup({ name: 'Bukti Ditolak', isActive: false, body: 'x' });

    expect(await service.compose('PAYMENT_REJECTED', { booking: booking as never })).toEqual({
      status: 'inactive',
      reason: 'Template "Bukti Ditolak" dinonaktifkan',
    });
  });

  it('leaves events without a template, or a missing one, to the plain message', async () => {
    const missing = setup(null);
    const none = setup({ name: 'T', isActive: true, body: 'x' });

    expect(
      await missing.service.compose('PAYMENT_VERIFIED', { booking: booking as never }),
    ).toEqual({
      status: 'none',
    });
    expect(await none.service.compose('BOOKING_CREATED', { booking: booking as never })).toEqual({
      status: 'none',
    });
    expect(none.prisma.whatsappTemplate.findUnique).not.toHaveBeenCalled();
  });
});
