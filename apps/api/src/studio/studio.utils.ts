/** Digits only, in international form without "+": 0812... and +62812... both become 62812... */
export function normalizeWhatsappNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

/** Accepts "@kayastory.id", "kayastory.id" or a full instagram.com URL and returns the bare handle. */
export function normalizeInstagramHandle(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '');
}

export function cleanGuarantees(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean);
}
