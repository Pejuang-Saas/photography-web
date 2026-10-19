import { WhatsappTemplatesService } from './whatsapp-templates.service';

const studio = {
  studioName: 'Kayastory Photography',
  whatsappNumber: '6281234567890',
  address: 'Jl. Tirto Agung No. 12',
  mapsUrl: null,
  instagramHandle: 'kayastory.id',
  openTime: '08:00',
  closeTime: '21:00',
};

const booking = {
  status: 'CONFIRMED',
  bookingCode: 'KYA-2026-111111',
  customerName: 'Anisa Rahmawati',
  packageName: 'Solo Kebaya',
  sessionDate: new Date('2026-11-05T00:00:00.000Z'),
  timeSlot: '09:30 - 10:30',
  paymentPlan: 'DP_50' as const,
  totalAmount: 450000,
  invoice: null,
  payments: [{ amount: 225000 }],
};

function setup(
  options: { template?: { id: string; name: string; body: string } | null; booking?: unknown } = {},
) {
  const template =
    options.template === undefined
      ? {
          id: 't1',
          name: 'Konfirmasi',
          body: 'Halo {customer_name}! Paket {package_name} pada {session_date}.',
        }
      : options.template;
  const prisma = {
    whatsappTemplate: {
      upsert: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(template),
    },
    booking: {
      findMany: jest
        .fn()
        .mockResolvedValue(
          options.booking === undefined ? [booking] : options.booking ? [options.booking] : [],
        ),
    },
  };
  const studioService = { getCurrent: jest.fn().mockResolvedValue(studio) };
  const config = {
    get: jest.fn(
      (key: string) =>
        ({ WEB_URL: 'https://kayastory.id', API_URL: 'https://api.kayastory.id' })[key],
    ),
  };
  return {
    prisma,
    service: new WhatsappTemplatesService(
      prisma as never,
      studioService as never,
      config as never,
      {} as never,
    ),
  };
}

describe('WhatsappTemplatesService', () => {
  it('offers only templates that are switched on', async () => {
    const { service, prisma } = setup();

    await service.list();

    expect(prisma.whatsappTemplate.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
  });

  it('does not offer a template that only an automatic event can fill', async () => {
    const { service, prisma } = setup();
    prisma.whatsappTemplate.findMany.mockResolvedValue([
      {
        id: 'a',
        code: 'PAYMENT_REJECTED',
        name: 'Ditolak',
        category: 'TRANSACTIONAL',
        body: 'Alasan: {rejection_reason}',
      },
      {
        id: 'b',
        code: 'PENGINGAT_H1',
        name: 'Pengingat',
        category: 'REMINDER',
        body: 'Halo {customer_name}',
      },
    ]);

    expect(await service.list()).toEqual([
      { id: 'b', code: 'PENGINGAT_H1', name: 'Pengingat', category: 'REMINDER' },
    ]);
  });

  it('fills the placeholders from the booking behind the number', async () => {
    const { service, prisma } = setup();

    const { text } = await service.render('t1', { phone: '6281234567890', name: 'Anisa WA' });

    expect(text).toBe('Halo Anisa Rahmawati! Paket Solo Kebaya pada 5 November 2026.');
    expect(prisma.booking.findMany.mock.calls[0][0].where.customerPhone.in).toEqual([
      '6281234567890',
      '081234567890',
    ]);
  });

  it('uses the WhatsApp name, or a neutral greeting, when there is no booking', async () => {
    const { service } = setup({
      booking: null,
      template: { id: 't3', name: 'Sapaan', body: 'Halo {customer_name}! Ini {studio_name}.' },
    });

    expect((await service.render('t3', { phone: '6281', name: 'Budi' })).text).toBe(
      'Halo Budi! Ini Kayastory Photography.',
    );
    expect((await service.render('t3', { phone: '6281', name: null })).text).toBe(
      'Halo Kakak! Ini Kayastory Photography.',
    );
  });

  it('refuses a booking template for a number with no booking, naming what is missing', async () => {
    const { service } = setup({ booking: null });

    await expect(
      service.render('t1', { phone: '6281234567890', name: 'Budi' }),
    ).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining('{package_name}'),
    });
  });

  it('does not look for a booking when the number is unknown', async () => {
    const { service, prisma } = setup({
      template: { id: 't3', name: 'Sapaan', body: 'Halo {customer_name}' },
    });

    await service.render('t3', { phone: null, name: null });

    expect(prisma.booking.findMany).not.toHaveBeenCalled();
  });

  it('never lets an unknown placeholder through to a customer', async () => {
    const { service } = setup({ template: { id: 't4', name: 'Salah', body: 'Halo {nama_typo}' } });

    await expect(service.render('t4', { phone: '6281234567890', name: 'x' })).rejects.toMatchObject(
      {
        status: 422,
        message: expect.stringContaining('{nama_typo}'),
      },
    );
  });

  it('answers 404 for a template that is missing or switched off', async () => {
    const { service } = setup({ template: null });

    await expect(service.render('t1', { phone: null, name: null })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('talks about the live booking, not a newer one that expired', async () => {
    const { service, prisma } = setup();
    prisma.booking.findMany.mockResolvedValue([
      { ...booking, status: 'EXPIRED', bookingCode: 'EXPIRED-NEW', packageName: 'Paket Hangus' },
      { ...booking, status: 'CONFIRMED', bookingCode: 'LIVE', packageName: 'Solo Kebaya' },
    ]);

    const { text } = await service.render('t1', { phone: '6281234567890', name: 'x' });

    expect(text).toContain('Solo Kebaya');
    expect(text).not.toContain('Paket Hangus');
  });

  it('treats a booking that has lapsed as no booking, so nothing stale is quoted', async () => {
    const { service, prisma } = setup();
    prisma.booking.findMany.mockResolvedValue([{ ...booking, status: 'EXPIRED' }]);

    await expect(service.render('t1', { phone: '6281234567890', name: 'x' })).rejects.toMatchObject(
      {
        status: 422,
        message: expect.stringContaining('booking yang aktif'),
      },
    );
  });

  it('falls back to the WhatsApp name for a number whose only booking lapsed', async () => {
    const { service, prisma } = setup({
      template: { id: 't3', name: 'Sapaan', body: 'Halo {customer_name}!' },
    });
    prisma.booking.findMany.mockResolvedValue([
      { ...booking, status: 'EXPIRED', customerName: 'Nama Lama' },
    ]);

    expect((await service.render('t3', { phone: '6281234567890', name: 'tann' })).text).toBe(
      'Halo tann!',
    );
  });
});
