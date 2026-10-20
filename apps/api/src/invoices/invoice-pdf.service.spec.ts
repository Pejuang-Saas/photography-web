import { InvoiceStatus } from '@prisma/client';
import { InvoicePdfService, safeFilename } from './invoice-pdf.service';

const invoice = (overrides: Record<string, unknown> = {}, payments = [{ amount: 225000 }]) => ({
  id: 'invoice-1',
  invoiceNumber: 'INV-KYA-2026-123456',
  amount: 225000,
  status: InvoiceStatus.ISSUED,
  issuedAt: new Date('2026-10-17T03:00:00.000Z'),
  booking: {
    customerName: 'Anisa Rahmawati',
    customerEmail: 'rahasia@example.test',
    customerPhone: '081299998888',
    bookingCode: 'KYA-2026-123456',
    packageName: 'Solo Kebaya Signature',
    packagePrice: 450000,
    totalAmount: 450000,
    paymentPlan: 'DP_50',
    sessionDate: new Date('2026-11-05T00:00:00.000Z'),
    timeSlot: '09:30 - 10:30',
    extraMinutes: 0,
    addOns: [] as Array<Record<string, unknown>>,
    payments,
  },
  ...overrides,
});

const studio = {
  studioName: 'Kayastory Photography',
  whatsappNumber: '6281234567890',
  address: 'Jl. Tirto Agung No. 12, Tembalang, Semarang',
  instagramHandle: 'kayastory.id',
};

function setup(
  row: ReturnType<typeof invoice> | null,
  studioRow: Record<string, unknown> = studio,
) {
  const prisma = { invoice: { findUnique: jest.fn().mockResolvedValue(row) } };
  const studioService = { getCurrent: jest.fn().mockResolvedValue(studioRow) };
  return { service: new InvoicePdfService(prisma as never, studioService as never), prisma };
}

/** Test PDFs are written uncompressed, so their text is stored as hex strings we can decode. */
function textOf(buffer: Buffer) {
  const raw = buffer.toString('latin1');
  return [...raw.matchAll(/<([0-9a-fA-F]{2,})>/g)]
    .map((match) => Buffer.from(match[1], 'hex').toString('latin1'))
    .join('')
    .replace(/ /g, ' ');
}

describe('safeFilename', () => {
  it('keeps invoice numbers and strips anything unsafe for a header', () => {
    expect(safeFilename('INV-KYA-2026-123456')).toBe('INV-KYA-2026-123456.pdf');
    expect(safeFilename('INV/..\\"x\r\ny')).toBe('INV-..-x-y.pdf');
  });
});

describe('InvoicePdfService', () => {
  it('produces a real PDF with the invoice number as its file name', async () => {
    const { service } = setup(invoice());

    const { filename, buffer } = await service.render('invoice-1');

    expect(filename).toBe('INV-KYA-2026-123456.pdf');
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.toString('latin1')).toContain('%%EOF');
    expect(buffer.length).toBeGreaterThan(2000);
  });

  it('shows who was billed, for what, and how much', async () => {
    const { service } = setup(invoice());

    const text = textOf((await service.render('invoice-1')).buffer);

    for (const expected of [
      'INVOICE',
      'INV-KYA-2026-123456',
      'Kayastory Photography',
      'Anisa Rahmawati',
      'KYA-2026-123456',
      'Solo Kebaya Signature',
      '09:30 - 10:30 WIB',
      'Rp 450.000',
      'Rp 225.000',
    ]) {
      expect(text).toContain(expected);
    }
  });

  it('marks a deposit invoice and shows what is still owed', async () => {
    const { service } = setup(invoice());

    const text = textOf((await service.render('invoice-1')).buffer);

    expect(text).toContain('DP TERVERIFIKASI');
    expect(text).toContain('Sisa pelunasan');
    expect(text).not.toContain('LUNAS');
  });

  it('marks a fully paid invoice as paid and drops the remaining-balance line', async () => {
    const { service } = setup(invoice({}, [{ amount: 450000 }]));

    const text = textOf((await service.render('invoice-1')).buffer);

    expect(text).toContain('LUNAS');
    expect(text).not.toContain('Sisa pelunasan');
    expect(text).not.toContain('DP TERVERIFIKASI');
  });

  it('lists each add-on with its quantity and price, and the extra session time', async () => {
    const row = invoice();
    row.booking.totalAmount = 600000;
    row.booking.extraMinutes = 60;
    row.booking.addOns = [
      {
        name: 'Tambahan waktu',
        unitLabel: '30 menit',
        unitPrice: 100000,
        quantity: 2,
        subtotal: 200000,
      },
      { name: 'Extra edit', unitLabel: '5 foto', unitPrice: 50000, quantity: 1, subtotal: 50000 },
    ];
    const { service } = setup(row);

    const text = textOf((await service.render('invoice-1')).buffer);

    expect(text).toContain('Tambahan waktu');
    expect(text).toContain('2 x 30 menit @');
    expect(text).toContain('Extra edit');
    expect(text).toContain('+60 menit');
  });

  it('never prints the customer contact details', async () => {
    const { service } = setup(invoice());

    const { buffer } = await service.render('invoice-1');
    const raw = buffer.toString('latin1');

    expect(textOf(buffer)).not.toContain('rahasia@example.test');
    expect(raw).not.toContain('081299998888');
    expect(textOf(buffer)).not.toContain('081299998888');
  });

  it('embeds the studio logo', async () => {
    const { service } = setup(invoice());

    const { buffer } = await service.render('invoice-1');

    expect(buffer.toString('latin1')).toContain('/Subtype /Image');
  });

  it('still renders when the studio has not filled in its details', async () => {
    const { service } = setup(invoice(), {
      studioName: 'Studio',
      whatsappNumber: null,
      address: null,
      instagramHandle: null,
    });

    const { buffer } = await service.render('invoice-1');

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('looks up only the payments that were actually received', async () => {
    const { service, prisma } = setup(invoice());

    await service.render('invoice-1');

    const include = prisma.invoice.findUnique.mock.calls[0][0].include.booking.include;
    expect(include.payments.where.status.in).toEqual(['PAID_DP', 'PAID_FULL']);
  });

  it('answers 404 for an unknown invoice', async () => {
    const { service } = setup(null);

    await expect(service.render('missing')).rejects.toThrow('Invoice not found');
  });

  it('will not serve a voided invoice', async () => {
    const { service } = setup(invoice({ status: InvoiceStatus.VOID }));

    await expect(service.render('invoice-1')).rejects.toThrow('Invoice not found');
  });
});
