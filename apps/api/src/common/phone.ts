/**
 * Indonesian mobile number, digits only with an optional leading "+": 0812..., 62812..., +62812...
 * After the 08 prefix comes a 1-9 operator digit and 7-11 more digits (10-14 digits in local form).
 * Spaces, dashes and parentheses are rejected on purpose; the web form strips them while typing.
 */
export const ID_MOBILE_PATTERN = /^(?:\+62|62|0)8[1-9][0-9]{7,11}$/;

export const ID_MOBILE_MESSAGE =
  'Nomor WhatsApp harus nomor seluler Indonesia berupa angka, contoh 081234567890';

export function isIdMobile(value: string) {
  return ID_MOBILE_PATTERN.test(value);
}
