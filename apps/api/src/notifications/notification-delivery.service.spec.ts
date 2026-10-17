jest.mock('../queues/queues.service', () => ({ QueuesService: class QueuesService {} }));

import { NotificationDeliveryService } from './notification-delivery.service';

const booking = {
  id: 'booking-1',
  bookingCode: 'KYA-2026-123456',
  customerName: 'Customer',
  customerEmail: 'customer@example.test',
  customerPhone: '081234567890',
  sessionDate: new Date('2026-11-01'),
  timeSlot: '08:30 - 09:30',
  invoice: { id: 'invoice-uuid-1', invoiceNumber: 'INV-KYA-2026-123456' },
};

const baseSettings = {
  enabled: true,
  autoSendInvoice: true,
};

function setup(settings: Partial<typeof baseSettings> = {}, wahaEnabled = false) {
  const prisma = { booking: { findUnique: jest.fn().mockResolvedValue(booking) } };
  const emailQueue = {
    enqueue: jest.fn().mockResolvedValue({}),
    skip: jest.fn().mockResolvedValue({}),
  };
  const waha = { isEnabled: jest.fn().mockReturnValue(wahaEnabled), sendText: jest.fn() };
  const templates = {
    compose: jest.fn().mockResolvedValue({
      status: 'ok',
      templateCode: 'X',
      subject: 'Subjek dari template',
      html: '<p>html</p>',
      text: 'teks dari template',
      attachments: [{ type: 'logo' }],
    }),
  };
  const service = new NotificationDeliveryService(
    prisma as never,
    emailQueue as never,
    { getCurrent: jest.fn().mockResolvedValue({ ...baseSettings, ...settings }) } as never,
    templates as never,
    waha as never,
  );
  return { service, emailQueue, waha, templates, prisma };
}

const event = (eventType: string) => ({
  eventKey: `${eventType}:1`,
  eventType,
  aggregateType: 'Booking',
  aggregateId: 'booking-1',
  payload: { bookingId: 'booking-1' },
});

describe('NotificationDeliveryService', () => {
  beforeEach(() => {
    process.env.SMTP_HOST = 'smtp.example.test';
    process.env.SMTP_FROM_EMAIL = 'studio@example.test';
  });

  afterAll(() => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_FROM_EMAIL;
  });

  it('skips with the missing variables when SMTP is not configured in the environment', async () => {
    delete process.env.SMTP_HOST;
    const { service, emailQueue } = setup();

    await service.dispatch(event('PAYMENT_VERIFIED'));

    expect(emailQueue.enqueue).not.toHaveBeenCalled();
    expect(emailQueue.skip.mock.calls[0][1]).toContain('SMTP_HOST');
  });

  it('queues the customer email rendered from its template, with a dedupe key tied to the event', async () => {
    const { service, emailQueue, templates } = setup();

    await service.dispatch(event('PAYMENT_VERIFIED'));

    expect(templates.compose).toHaveBeenCalledWith('INVOICE_OFFICIAL', {
      booking: expect.objectContaining({ bookingCode: 'KYA-2026-123456' }),
      rejectionReason: undefined,
    });
    expect(emailQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: 'PAYMENT_VERIFIED:1:email',
        to: 'customer@example.test',
        bookingId: 'booking-1',
        subject: 'Subjek dari template',
        html: '<p>html</p>',
        text: 'teks dari template',
        templateCode: 'INVOICE_OFFICIAL',
      }),
    );
    expect(emailQueue.skip).not.toHaveBeenCalled();
  });

  it.each([
    ['PAYMENT_VERIFIED', 'INVOICE_OFFICIAL'],
    ['PAYMENT_REJECTED', 'PAYMENT_REJECTED'],
    ['BOOKING_EXPIRED', 'BOOKING_EXPIRED'],
  ])('uses the %s template for the %s event', async (eventType, code) => {
    const { service, templates } = setup();

    await service.dispatch(event(eventType));

    expect(templates.compose).toHaveBeenCalledWith(code, expect.anything());
  });

  it('passes the rejection reason on to the rejected-payment template', async () => {
    const { service, templates } = setup();

    await service.dispatch({
      ...event('PAYMENT_REJECTED'),
      payload: { bookingId: 'booking-1', reason: 'Nominal kurang' },
    });

    expect(templates.compose).toHaveBeenCalledWith('PAYMENT_REJECTED', {
      booking: expect.anything(),
      rejectionReason: 'Nominal kurang',
    });
  });

  it('attaches the invoice PDF and the logo to the invoice email', async () => {
    const { service, emailQueue } = setup();

    await service.dispatch(event('PAYMENT_VERIFIED'));

    expect(emailQueue.enqueue.mock.calls[0][0].attachments).toEqual([
      { type: 'logo' },
      { type: 'invoice-pdf', invoiceId: 'invoice-uuid-1' },
    ]);
  });

  it.each(['PAYMENT_REJECTED', 'BOOKING_EXPIRED'])(
    'attaches only the logo, never an invoice, to the %s email',
    async (eventType) => {
      const { service, emailQueue } = setup();

      await service.dispatch(event(eventType));

      expect(emailQueue.enqueue.mock.calls[0][0].attachments).toEqual([{ type: 'logo' }]);
    },
  );

  it('sends the invoice email without a PDF when no invoice exists yet', async () => {
    const { service, emailQueue, prisma } = setup();
    prisma.booking.findUnique.mockResolvedValue({ ...booking, invoice: null });

    await service.dispatch(event('PAYMENT_VERIFIED'));

    expect(emailQueue.enqueue.mock.calls[0][0].attachments).toEqual([{ type: 'logo' }]);
  });

  it('records a skip, not a failure, when the template has been switched off', async () => {
    const { service, emailQueue, templates } = setup();
    templates.compose.mockResolvedValue({
      status: 'inactive',
      templateCode: 'INVOICE_OFFICIAL',
      reason: 'Template "Pengiriman Invoice Resmi" dinonaktifkan',
    });

    await expect(service.dispatch(event('PAYMENT_VERIFIED'))).resolves.toBeUndefined();

    expect(emailQueue.enqueue).not.toHaveBeenCalled();
    expect(emailQueue.skip).toHaveBeenCalledWith(
      expect.objectContaining({ templateCode: 'INVOICE_OFFICIAL' }),
      'Template "Pengiriman Invoice Resmi" dinonaktifkan',
    );
  });

  it.each([
    ['email is switched off', { enabled: false }, 'PAYMENT_VERIFIED', 'dinonaktifkan'],
    ['invoices are manual', { autoSendInvoice: false }, 'PAYMENT_VERIFIED', 'invoice otomatis'],
  ])('records a skip, not a failure, when %s', async (_label, settings, type, reason) => {
    const { service, emailQueue } = setup(settings);

    await expect(service.dispatch(event(type))).resolves.toBeUndefined();

    expect(emailQueue.enqueue).not.toHaveBeenCalled();
    expect(emailQueue.skip).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining(reason),
    );
  });

  it.each(['BOOKING_CREATED', 'PAYMENT_PROOF_SUBMITTED'])(
    'never emails anyone for the studio-side event %s',
    async (eventType) => {
      const { service, emailQueue, templates } = setup();

      await expect(service.dispatch(event(eventType))).resolves.toBeUndefined();

      expect(emailQueue.enqueue).not.toHaveBeenCalled();
      expect(emailQueue.skip).not.toHaveBeenCalled();
      expect(templates.compose).not.toHaveBeenCalled();
    },
  );

  it('still tells the studio over WhatsApp about studio-side events when that is enabled', async () => {
    process.env.WAHA_ADMIN_CHAT_ID = '6281234567890@c.us';
    const { service, waha, emailQueue } = setup({}, true);

    await service.dispatch(event('BOOKING_CREATED'));
    delete process.env.WAHA_ADMIN_CHAT_ID;

    expect(waha.sendText).toHaveBeenCalledWith(
      '6281234567890@c.us',
      expect.stringContaining('Booking'),
    );
    expect(emailQueue.enqueue).not.toHaveBeenCalled();
  });

  it('still reports a misconfiguration when a customer has no email and no phone', async () => {
    const { service, prisma } = setup();
    prisma.booking.findUnique.mockResolvedValue({
      ...booking,
      customerEmail: '',
      customerPhone: '',
    });

    await expect(service.dispatch(event('PAYMENT_VERIFIED'))).rejects.toThrow(
      'No notification delivery channel configured',
    );
  });

  it('queues the email before WhatsApp so a WhatsApp failure retry cannot lose or double it', async () => {
    const { service, emailQueue, waha } = setup({}, true);
    waha.sendText.mockRejectedValue(new Error('waha down'));

    await expect(service.dispatch(event('PAYMENT_VERIFIED'))).rejects.toThrow('waha down');

    expect(emailQueue.enqueue).toHaveBeenCalledTimes(1);
  });
});
