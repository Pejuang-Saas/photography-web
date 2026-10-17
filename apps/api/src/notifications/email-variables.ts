/**
 * Every {placeholder} a template may use. Admins pick them from this list in the builder, and
 * saving a template that mentions anything else is refused, so a typo can never reach a customer.
 */
export const EMAIL_VARIABLES = [
  { key: 'customer_name', label: 'Nama klien', group: 'Pemesan', sample: 'Anisa Rahmawati' },
  { key: 'booking_code', label: 'Kode booking', group: 'Reservasi', sample: 'KYA-2026-904123' },
  { key: 'package_name', label: 'Nama paket', group: 'Reservasi', sample: 'Solo Kebaya Signature' },
  { key: 'session_date', label: 'Tanggal sesi', group: 'Reservasi', sample: '25 Agustus 2026' },
  { key: 'session_time', label: 'Jam sesi', group: 'Reservasi', sample: '09:30 - 10:30 WIB' },
  { key: 'payment_plan', label: 'Skema pembayaran', group: 'Pembayaran', sample: 'DP 50%' },
  { key: 'total_price', label: 'Total biaya', group: 'Pembayaran', sample: 'Rp 450.000' },
  { key: 'paid_amount', label: 'Jumlah dibayar', group: 'Pembayaran', sample: 'Rp 225.000' },
  { key: 'remaining_amount', label: 'Sisa pelunasan', group: 'Pembayaran', sample: 'Rp 225.000' },
  {
    key: 'invoice_number',
    label: 'Nomor invoice',
    group: 'Pembayaran',
    sample: 'INV-KYA-2026-904123',
  },
  {
    key: 'invoice_url',
    label: 'Link unduh invoice (PDF)',
    group: 'Tautan',
    sample: 'https://api.kayastory.id/public/invoices/1f3a/pdf',
  },
  {
    key: 'rejection_reason',
    label: 'Alasan penolakan',
    group: 'Pembayaran',
    sample: 'Nominal transfer kurang',
  },
  { key: 'studio_name', label: 'Nama studio', group: 'Studio', sample: 'Kayastory Photography' },
  {
    key: 'studio_address',
    label: 'Alamat studio',
    group: 'Studio',
    sample: 'Jl. Tirto Agung No. 12, Tembalang, Semarang',
  },
  { key: 'studio_hours', label: 'Jam operasional', group: 'Studio', sample: '08.00 - 21.00 WIB' },
  {
    key: 'studio_whatsapp',
    label: 'Nomor WhatsApp studio',
    group: 'Studio',
    sample: '081234567890',
  },
  {
    key: 'studio_whatsapp_url',
    label: 'Link WhatsApp studio',
    group: 'Tautan',
    sample: 'https://wa.me/6281234567890',
  },
  { key: 'studio_instagram', label: 'Instagram studio', group: 'Studio', sample: '@kayastory.id' },
  {
    key: 'studio_instagram_url',
    label: 'Link Instagram studio',
    group: 'Tautan',
    sample: 'https://instagram.com/kayastory.id',
  },
  {
    key: 'studio_maps_url',
    label: 'Link Google Maps',
    group: 'Tautan',
    sample: 'https://maps.google.com/?q=kayastory',
  },
  { key: 'site_url', label: 'Alamat website', group: 'Tautan', sample: 'https://kayastory.id' },
] as const;

export type VariableKey = (typeof EMAIL_VARIABLES)[number]['key'];
export type VariableValues = Record<VariableKey, string>;

const KNOWN = new Set<string>(EMAIL_VARIABLES.map((variable) => variable.key));

// Deliberately broader than the real keys (which are lowercase and underscores only): anything
// shaped like a placeholder is checked, so `{typo2}` or `{Customer_Name}` is reported on save
// instead of reaching a customer as literal text.
export const VARIABLE_PATTERN = /\{([A-Za-z0-9_]+)\}/g;

export function isVariableKey(name: string): name is VariableKey {
  return KNOWN.has(name);
}

/** Distinct placeholder names used in `text`, in order of first appearance. */
export function extractVariables(text: string | null | undefined) {
  if (!text) return [];
  return [...new Set([...text.matchAll(VARIABLE_PATTERN)].map((match) => match[1]))];
}

export function unknownVariables(text: string | null | undefined) {
  return extractVariables(text).filter((name) => !isVariableKey(name));
}

export const SAMPLE_VALUES = Object.fromEntries(
  EMAIL_VARIABLES.map((variable) => [variable.key, variable.sample]),
) as VariableValues;

export function emptyValues(): VariableValues {
  return Object.fromEntries(
    EMAIL_VARIABLES.map((variable) => [variable.key, '']),
  ) as VariableValues;
}
