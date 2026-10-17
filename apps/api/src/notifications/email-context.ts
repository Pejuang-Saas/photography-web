import type { BookingRow } from './email-renderer';
import { emptyValues, SAMPLE_VALUES, type VariableValues } from './email-variables';

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});
const longDate = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC', // session dates are stored as a calendar date at UTC midnight
});

export type StudioForEmail = {
  studioName: string;
  whatsappNumber: string | null;
  address: string | null;
  mapsUrl: string | null;
  instagramHandle: string | null;
  openTime: string | null;
  closeTime: string | null;
};

export type BookingForEmail = {
  bookingCode: string;
  customerName: string;
  packageName: string;
  sessionDate: Date;
  timeSlot: string;
  paymentPlan: 'DP_50' | 'FULL';
  totalAmount: number;
  invoice: { id: string; invoiceNumber: string } | null;
  /** Payments that were actually received (paid DP or paid in full). */
  payments: Array<{ amount: number }>;
};

export type EmailContext = { values: VariableValues; bookingRows: BookingRow[] };

export function studioValues(
  studio: StudioForEmail | null,
  siteUrl: string | undefined,
): Partial<VariableValues> {
  const handle = studio?.instagramHandle ?? '';
  const hours =
    studio?.openTime && studio.closeTime
      ? `${studio.openTime.replace(':', '.')} - ${studio.closeTime.replace(':', '.')} WIB`
      : '';

  return {
    studio_name: studio?.studioName ?? '',
    studio_address: studio?.address ?? '',
    studio_hours: hours,
    studio_whatsapp: studio?.whatsappNumber ?? '',
    studio_whatsapp_url: studio?.whatsappNumber ? `https://wa.me/${studio.whatsappNumber}` : '',
    studio_instagram: handle ? `@${handle}` : '',
    studio_instagram_url: handle ? `https://instagram.com/${handle}` : '',
    studio_maps_url: studio?.mapsUrl ?? '',
    site_url: siteUrl ?? '',
  };
}

function rowsFor(values: VariableValues, paid: number, remaining: number): BookingRow[] {
  const rows: BookingRow[] = [
    { label: 'Kode booking', value: values.booking_code },
    { label: 'Paket', value: values.package_name },
    { label: 'Tanggal sesi', value: values.session_date },
    { label: 'Jam sesi', value: values.session_time },
    { label: 'Skema pembayaran', value: values.payment_plan },
    { label: 'Total biaya', value: values.total_price },
  ];
  if (paid > 0) rows.push({ label: 'Sudah dibayar', value: values.paid_amount });
  if (paid > 0 && remaining > 0)
    rows.push({ label: 'Sisa pelunasan', value: values.remaining_amount });
  if (values.invoice_number) rows.push({ label: 'No. invoice', value: values.invoice_number });
  return rows;
}

export function buildContext(input: {
  booking: BookingForEmail;
  studio: StudioForEmail | null;
  siteUrl?: string;
  /** Public base URL of the API, used to build the invoice download link. */
  apiUrl?: string;
  rejectionReason?: string;
}): EmailContext {
  const { booking } = input;
  const paid = booking.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = Math.max(0, booking.totalAmount - paid);

  const values: VariableValues = {
    ...emptyValues(),
    ...studioValues(input.studio, input.siteUrl),
    customer_name: booking.customerName,
    booking_code: booking.bookingCode,
    package_name: booking.packageName,
    session_date: longDate.format(booking.sessionDate),
    session_time: `${booking.timeSlot} WIB`,
    payment_plan: booking.paymentPlan === 'FULL' ? 'Lunas' : 'DP 50%',
    total_price: rupiah.format(booking.totalAmount),
    paid_amount: paid > 0 ? rupiah.format(paid) : '',
    remaining_amount: rupiah.format(remaining),
    invoice_number: booking.invoice?.invoiceNumber ?? '',
    invoice_url:
      booking.invoice && input.apiUrl
        ? `${input.apiUrl.replace(/\/$/, '')}/public/invoices/${booking.invoice.id}/pdf`
        : '',
    rejection_reason: input.rejectionReason ?? '',
  };

  return { values, bookingRows: rowsFor(values, paid, remaining) };
}

/** Example data for the builder's preview: sample booking, but the studio's real details. */
export function sampleContext(studio: StudioForEmail | null, siteUrl?: string): EmailContext {
  const real = Object.fromEntries(
    Object.entries(studioValues(studio, siteUrl)).filter(([, value]) => value),
  );
  const values = { ...SAMPLE_VALUES, ...real } as VariableValues;
  return { values, bookingRows: rowsFor(values, 1, 1) };
}
