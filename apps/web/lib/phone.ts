/** Mirror of the API rule (apps/api/src/common/phone.ts): Indonesian mobile, digits plus optional "+". */
const ID_MOBILE_PATTERN = /^(?:\+62|62|0)8[1-9][0-9]{7,11}$/;

// No maxLength attribute on the inputs: the browser would cut pasted text (spaces and dashes
// included) before it is cleaned, dropping real digits. The cap is applied after cleaning instead.
const PHONE_MAX_LENGTH = 15;
export const PHONE_ERROR = 'Nomor WhatsApp harus nomor seluler Indonesia, contoh 081234567890.';

export function isIdMobile(value: string) {
  return ID_MOBILE_PATTERN.test(value);
}

/**
 * Keeps only what a phone number may contain while the user types or pastes: digits, and a "+" in
 * first place. "0812-3456-7890" becomes "081234567890"; letters and symbols never appear.
 */
export function sanitizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, '');
  const plus = value.trimStart().startsWith('+') ? '+' : '';
  return (plus + digits).slice(0, PHONE_MAX_LENGTH);
}
