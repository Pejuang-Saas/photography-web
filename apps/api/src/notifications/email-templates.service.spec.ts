import { Prisma } from '@prisma/client';
import { SYSTEM_TEMPLATES } from './email-template-defaults';
import { EmailTemplatesService, validateTemplate } from './email-templates.service';

const content = {
  name: 'Tes',
  description: null,
  subject: 'Halo {customer_name}',
  heading: 'Judul',
  bodyText: 'Isi untuk {customer_name}',
  includeBookingTable: false,
  ctaText: null,
  ctaUrl: null,
  ctaColor: '#d9a521',
  footerText: null,
};

const dto = (overrides: Record<string, unknown> = {}) => ({
  name: 'Tes',
  subject: 'Halo {customer_name}',
  heading: 'Judul',
  bodyText: 'Isi untuk {customer_name}',
  includeBookingTable: false,
  ctaColor: '#d9a521',
  ...overrides,
});

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'template-1',
  code: 'INVOICE_OFFICIAL',
  isSystem: true,
  isActive: true,
  ...SYSTEM_TEMPLATES[0],
  ...overrides,
});

function setup(existing: ReturnType<typeof row> | null = row()) {
  const emailTemplate = {
    upsert: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(existing),
    create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'new', ...data })),
    update: jest.fn().mockImplementation(async ({ data }) => ({ id: 'template-1', ...data })),
    delete: jest.fn().mockResolvedValue({}),
  };
  const studio = {
    getCurrent: jest.fn().mockResolvedValue({
      studioName: 'Studio Asli',
      whatsappNumber: '6281234567890',
      address: 'Jl. Asli 1',
      mapsUrl: null,
      instagramHandle: null,
      openTime: null,
      closeTime: null,
    }),
  };
  const service = new EmailTemplatesService({ emailTemplate } as never, studio as never);
  return { service, emailTemplate };
}

const problemsOf = (fn: () => void) => {
  try {
    fn();
  } catch (error) {
    return (error as { getResponse: () => { message: string[] } }).getResponse().message;
  }
  return [];
};

describe('validateTemplate', () => {
  it('accepts a template that only uses known variables', () => {
    expect(problemsOf(() => validateTemplate(content))).toEqual([]);
  });

  it('names every unknown variable and where it was used', () => {
    const problems = problemsOf(() =>
      validateTemplate({
        ...content,
        subject: 'Halo {nama_klien}',
        bodyText: '{customer_name} {typo} {typo2}',
      }),
    );

    expect(problems).toEqual([
      'Variabel tidak dikenal di subjek: {nama_klien}',
      'Variabel tidak dikenal di isi email: {typo}, {typo2}',
    ]);
  });

  it('requires the button text and link together', () => {
    expect(problemsOf(() => validateTemplate({ ...content, ctaText: 'Klik' }))).toEqual([
      'Teks tombol dan tautan tombol harus diisi bersama, atau dikosongkan bersama',
    ]);
    expect(
      problemsOf(() => validateTemplate({ ...content, ctaUrl: 'https://a.test' })),
    ).toHaveLength(1);
    expect(
      problemsOf(() => validateTemplate({ ...content, ctaText: 'Klik', ctaUrl: 'https://a.test' })),
    ).toEqual([]);
  });

  it.each(['javascript:alert(1)', 'ftp://a.test', 'wa.me/123', 'data:text/html,x'])(
    'refuses the button link %s',
    (ctaUrl) => {
      const problems = problemsOf(() => validateTemplate({ ...content, ctaText: 'Klik', ctaUrl }));

      expect(problems.join()).toContain('Tautan tombol harus diawali');
    },
  );

  it('allows a link that starts with a variable', () => {
    expect(
      problemsOf(() =>
        validateTemplate({ ...content, ctaText: 'Klik', ctaUrl: '{studio_whatsapp_url}' }),
      ),
    ).toEqual([]);
  });

  it('keeps the subject and heading on one line', () => {
    const problems = problemsOf(() =>
      validateTemplate({ ...content, subject: 'a\nBcc: x@y.test', heading: 'b\nc' }),
    );

    expect(problems).toEqual(['Subjek harus satu baris', 'Judul harus satu baris']);
  });
});

describe('EmailTemplatesService', () => {
  it('creates the built-in templates once, without overwriting edits', async () => {
    const { service, emailTemplate } = setup();

    await service.list();
    await service.list();

    expect(emailTemplate.upsert).toHaveBeenCalledTimes(SYSTEM_TEMPLATES.length);
    expect(emailTemplate.upsert.mock.calls[0][0]).toMatchObject({
      update: {},
      create: { isSystem: true },
    });
  });

  it('survives another process creating a built-in template at the same moment', async () => {
    const { service, emailTemplate } = setup();
    emailTemplate.upsert.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );

    await expect(service.list()).resolves.toEqual([]);
  });

  it('tells which templates send themselves, and leaves the rest without a trigger', async () => {
    const { service, emailTemplate } = setup();
    emailTemplate.findMany.mockResolvedValue([
      { code: 'INVOICE_OFFICIAL' },
      { code: 'REMINDER_H1' },
      { code: 'CUSTOM_AB12' },
    ]);

    const list = await service.list();

    expect(list.map((t) => t.trigger)).toEqual([
      'Otomatis saat pembayaran diverifikasi',
      null,
      null,
    ]);
  });

  it('creates a custom template with a generated code, trimmed text and no system flag', async () => {
    const { service, emailTemplate } = setup();

    await service.create(dto({ name: '  Promo  ', ctaText: '  ', footerText: '' }) as never);

    expect(emailTemplate.create.mock.calls[0][0].data).toMatchObject({
      name: 'Promo',
      ctaText: null,
      footerText: null,
      isSystem: false,
      isActive: true,
    });
    expect(emailTemplate.create.mock.calls[0][0].data.code).toMatch(/^CUSTOM_[0-9A-F]{8}$/);
  });

  it('refuses to save a template with an unknown variable', async () => {
    const { service, emailTemplate } = setup();

    await expect(service.create(dto({ subject: '{nama}' }) as never)).rejects.toThrow();
    await expect(
      service.update('template-1', dto({ subject: '{nama}' }) as never),
    ).rejects.toThrow();
    expect(emailTemplate.create).not.toHaveBeenCalled();
    expect(emailTemplate.update).not.toHaveBeenCalled();
  });

  it('never changes the code of an existing template when editing it', async () => {
    const { service, emailTemplate } = setup();

    await service.update('template-1', dto() as never);

    expect(emailTemplate.update.mock.calls[0][0].data).not.toHaveProperty('code');
  });

  it('will not delete a built-in template but deletes a custom one', async () => {
    const system = setup(row());
    await expect(system.service.remove('template-1')).rejects.toThrow('tidak bisa dihapus');
    expect(system.emailTemplate.delete).not.toHaveBeenCalled();

    const custom = setup(row({ isSystem: false, code: 'CUSTOM_AB12CD34' }));
    await custom.service.remove('template-1');
    expect(custom.emailTemplate.delete).toHaveBeenCalled();
  });

  it('duplicates into an independent custom template', async () => {
    const { service, emailTemplate } = setup();

    await service.duplicate('template-1');

    const data = emailTemplate.create.mock.calls[0][0].data;
    expect(data.isSystem).toBe(false);
    expect(data.code).toMatch(/^CUSTOM_/);
    expect(data.name).toBe(`${SYSTEM_TEMPLATES[0].name} (Salinan)`);
    expect(data.subject).toBe(SYSTEM_TEMPLATES[0].subject);
  });

  it('restores a built-in template to its shipped text, and only those', async () => {
    const edited = setup(row({ subject: 'Diubah', isActive: false }));
    await edited.service.reset('template-1');
    expect(edited.emailTemplate.update.mock.calls[0][0].data).toMatchObject({
      subject: SYSTEM_TEMPLATES[0].subject,
      isActive: true,
    });

    const custom = setup(row({ isSystem: false, code: 'CUSTOM_AB12CD34' }));
    await expect(custom.service.reset('template-1')).rejects.toThrow('template bawaan');
  });

  it('throws 404 for an unknown template', async () => {
    const { service } = setup(null);

    await expect(service.get('missing')).rejects.toThrow('Template not found');
  });

  it('previews with the logo embedded as a data URL, which a browser can show', async () => {
    const { service } = setup();

    const out = await service.preview(dto() as never);

    expect(out.html).toMatch(/<img src="data:image\/png;base64,/);
    expect(out.html).not.toContain('cid:');
  });

  it('moves studios that still have the old invoice button to the PDF button, and only those', async () => {
    const { service, emailTemplate } = setup();
    (emailTemplate as unknown as { updateMany: jest.Mock }).updateMany = jest
      .fn()
      .mockResolvedValue({ count: 1 });

    await service.list();

    expect((emailTemplate as unknown as { updateMany: jest.Mock }).updateMany).toHaveBeenCalledWith(
      {
        where: {
          code: 'INVOICE_OFFICIAL',
          ctaText: 'Hubungi Kami via WhatsApp',
          ctaUrl: '{studio_whatsapp_url}',
        },
        data: { ctaText: 'Unduh Invoice Resmi (PDF)', ctaUrl: '{invoice_url}' },
      },
    );
  });

  it('previews a draft with sample booking data and the real studio details', async () => {
    const { service } = setup();

    const out = await service.preview(
      dto({
        bodyText: 'Halo {customer_name} dari {studio_name}',
        includeBookingTable: true,
      }) as never,
    );

    expect(out.subject).toBe('Halo Anisa Rahmawati');
    expect(out.html).toContain('Halo Anisa Rahmawati dari Studio Asli');
    expect(out.html).toContain('Kode booking');
  });

  describe('compose', () => {
    const booking = {
      bookingCode: 'KYA-2026-123456',
      customerName: 'Anisa',
      packageName: 'Solo',
      sessionDate: new Date('2026-08-25T00:00:00.000Z'),
      timeSlot: '09:30 - 10:30',
      paymentPlan: 'FULL' as const,
      totalAmount: 450000,
      invoice: { id: 'inv-uuid-1', invoiceNumber: 'INV-1' },
      payments: [{ amount: 450000 }],
    };

    it('renders the template for a real booking', async () => {
      const { service } = setup();

      const out = await service.compose('INVOICE_OFFICIAL', { booking });

      expect(out).toMatchObject({ status: 'ok', templateCode: 'INVOICE_OFFICIAL' });
      if (out.status === 'ok') {
        expect(out.subject).toBe('[Invoice #INV-1] Konfirmasi Reservasi Foto Wisuda Kak Anisa');
        expect(out.html).toContain('KYA-2026-123456');
        expect(out.html).toContain('https://wa.me/6281234567890');
      }
    });

    it('sends the invoice link and the logo as an inline image, not a web address', async () => {
      process.env.API_URL = 'https://api.test';
      const { service } = setup();

      const out = await service.compose('INVOICE_OFFICIAL', { booking });
      delete process.env.API_URL;

      expect(out.status).toBe('ok');
      if (out.status === 'ok') {
        expect(out.html).toContain('href="https://api.test/public/invoices/inv-uuid-1/pdf"');
        expect(out.html).toContain('Unduh Invoice Resmi (PDF)');
        expect(out.html).toContain('<img src="cid:studio-logo"');
        expect(out.attachments).toEqual([{ type: 'logo' }]);
      }
    });

    it('leaves the button out, rather than break, when the API address is unknown', async () => {
      delete process.env.API_URL;
      const { service } = setup();

      const out = await service.compose('INVOICE_OFFICIAL', { booking });

      if (out.status === 'ok') expect(out.html).not.toContain('Unduh Invoice Resmi');
    });

    it('reports an inactive template instead of rendering it', async () => {
      const { service } = setup(row({ isActive: false }));

      await expect(service.compose('INVOICE_OFFICIAL', { booking })).resolves.toMatchObject({
        status: 'inactive',
        reason: expect.stringContaining('dinonaktifkan'),
      });
    });

    it('reports a missing template instead of throwing', async () => {
      const { service } = setup(null);

      await expect(service.compose('NOPE', { booking })).resolves.toMatchObject({
        status: 'inactive',
        reason: expect.stringContaining('tidak ditemukan'),
      });
    });
  });
});

describe('system templates', () => {
  it.each(SYSTEM_TEMPLATES.map((template) => [template.code, template] as const))(
    '%s only uses known variables and a valid button',
    (_code, template) => {
      const { code: _c, ...rest } = template;
      expect(problemsOf(() => validateTemplate(rest))).toEqual([]);
    },
  );
});
