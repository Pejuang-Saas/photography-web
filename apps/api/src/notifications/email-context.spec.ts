import { buildContext, sampleContext, studioValues, type BookingForEmail } from './email-context';

const studio = {
  studioName: 'Kayastory Photography',
  whatsappNumber: '6281234567890',
  address: 'Jl. Tirto Agung No. 12, Semarang',
  mapsUrl: 'https://maps.example.test/x',
  instagramHandle: 'kayastory.id',
  openTime: '08:00',
  closeTime: '21:00',
};

const booking: BookingForEmail = {
  bookingCode: 'KYA-2026-123456',
  customerName: 'Anisa Rahmawati',
  packageName: 'Solo Kebaya',
  sessionDate: new Date('2026-08-25T00:00:00.000Z'),
  timeSlot: '09:30 - 10:30',
  paymentPlan: 'DP_50',
  totalAmount: 450000,
  invoice: { id: 'invoice-uuid-1', invoiceNumber: 'INV-KYA-2026-123456' },
  payments: [{ amount: 225000 }],
};

describe('buildContext', () => {
  it('formats the booking for an Indonesian reader', () => {
    const { values } = buildContext({ booking, studio });

    expect(values).toMatchObject({
      customer_name: 'Anisa Rahmawati',
      booking_code: 'KYA-2026-123456',
      session_date: '25 Agustus 2026',
      session_time: '09:30 - 10:30 WIB',
      payment_plan: 'DP 50%',
      invoice_number: 'INV-KYA-2026-123456',
    });
    expect(values.total_price.replace(/\s/g, ' ')).toBe('Rp 450.000');
    expect(values.paid_amount.replace(/\s/g, ' ')).toBe('Rp 225.000');
    expect(values.remaining_amount.replace(/\s/g, ' ')).toBe('Rp 225.000');
  });

  it('does not shift the session date with the server time zone', () => {
    const { values } = buildContext({
      booking: { ...booking, sessionDate: new Date('2026-12-31T00:00:00.000Z') },
      studio,
    });

    expect(values.session_date).toBe('31 Desember 2026');
  });

  it('adds paid and remaining rows only when there is something paid and left to pay', () => {
    const labels = (b: BookingForEmail) =>
      buildContext({ booking: b, studio }).bookingRows.map((row) => row.label);

    expect(labels(booking)).toEqual(
      expect.arrayContaining(['Sudah dibayar', 'Sisa pelunasan', 'No. invoice']),
    );
    expect(
      labels({ ...booking, payments: [{ amount: 450000 }], paymentPlan: 'FULL' }),
    ).not.toContain('Sisa pelunasan');
    const unpaid = labels({ ...booking, payments: [], invoice: null });
    expect(unpaid).not.toContain('Sudah dibayar');
    expect(unpaid).not.toContain('No. invoice');
  });

  it('never reports a negative remaining amount', () => {
    const { values } = buildContext({
      booking: { ...booking, payments: [{ amount: 999999 }] },
      studio,
    });

    expect(values.remaining_amount.replace(/\s/g, ' ')).toBe('Rp 0');
  });

  it('carries the rejection reason and leaves missing data empty', () => {
    const { values } = buildContext({
      booking: { ...booking, invoice: null, payments: [] },
      studio: null,
      rejectionReason: 'Nominal kurang',
    });

    expect(values.rejection_reason).toBe('Nominal kurang');
    expect(values.invoice_number).toBe('');
    expect(values.paid_amount).toBe('');
    expect(values.studio_name).toBe('');
  });
});

describe('invoice link', () => {
  const link = (
    input: Partial<Parameters<typeof buildContext>[0]> & { booking?: BookingForEmail },
  ) => buildContext({ booking, studio, ...input }).values.invoice_url;

  it('points at the public PDF endpoint of the API', () => {
    expect(link({ apiUrl: 'https://api.kayastory.id' })).toBe(
      'https://api.kayastory.id/public/invoices/invoice-uuid-1/pdf',
    );
  });

  it('copes with a trailing slash on the API address', () => {
    expect(link({ apiUrl: 'https://api.kayastory.id/' })).toBe(
      'https://api.kayastory.id/public/invoices/invoice-uuid-1/pdf',
    );
  });

  it('is empty without an API address or without an invoice, so the button is left out', () => {
    expect(link({})).toBe('');
    expect(
      link({ apiUrl: 'https://api.kayastory.id', booking: { ...booking, invoice: null } }),
    ).toBe('');
  });
});

describe('studioValues', () => {
  it('derives links and display text from the stored studio profile', () => {
    expect(studioValues(studio, 'https://kayastory.id')).toMatchObject({
      studio_whatsapp: '6281234567890',
      studio_whatsapp_url: 'https://wa.me/6281234567890',
      studio_instagram: '@kayastory.id',
      studio_instagram_url: 'https://instagram.com/kayastory.id',
      studio_maps_url: 'https://maps.example.test/x',
      studio_hours: '08.00 - 21.00 WIB',
      site_url: 'https://kayastory.id',
    });
  });

  it('leaves links empty when the studio has not set them', () => {
    expect(
      studioValues(
        { ...studio, whatsappNumber: null, instagramHandle: null, openTime: null },
        undefined,
      ),
    ).toMatchObject({
      studio_whatsapp_url: '',
      studio_instagram_url: '',
      studio_instagram: '',
      studio_hours: '',
      site_url: '',
    });
  });
});

describe('sampleContext', () => {
  it('uses a sample booking but the real studio details where they exist', () => {
    const { values } = sampleContext({ ...studio, studioName: 'Studio Asli' });

    expect(values.customer_name).toBe('Anisa Rahmawati');
    expect(values.studio_name).toBe('Studio Asli');
  });

  it('falls back to sample studio details when the studio field is empty', () => {
    const { values } = sampleContext({ ...studio, instagramHandle: null });

    expect(values.studio_instagram).toBe('@kayastory.id');
  });
});
