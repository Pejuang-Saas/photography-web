import { todayWib } from './format';
import { isIdMobile, PHONE_ERROR } from './phone';

export const TIME_SLOTS = [
  '08:30 - 09:30',
  '09:30 - 10:30',
  '10:30 - 11:30',
  '13:00 - 14:30',
  '15:00 - 16:30',
];

export type CustomerForm = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  sessionDate: string; // YYYY-MM-DD
  timeSlot: string;
  notes: string;
};

export const EMPTY_CUSTOMER_FORM: CustomerForm = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  sessionDate: '',
  timeSlot: '',
  notes: '',
};

export type CustomerErrors = Partial<Record<keyof CustomerForm, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Rules from the checkout spec: name >= 3, Indonesian mobile number, valid email, not in the past. */
export function validateCustomerForm(form: CustomerForm, today = todayWib()): CustomerErrors {
  const errors: CustomerErrors = {};

  if (form.customerName.trim().length < 3) errors.customerName = 'Nama minimal 3 huruf.';
  if (!isIdMobile(form.customerPhone.trim())) errors.customerPhone = PHONE_ERROR;
  if (!EMAIL_PATTERN.test(form.customerEmail.trim())) {
    errors.customerEmail = 'Format email belum benar.';
  }
  if (!form.sessionDate) errors.sessionDate = 'Pilih tanggal sesi.';
  else if (form.sessionDate < today) errors.sessionDate = 'Tanggal tidak boleh di masa lalu.';
  if (!form.timeSlot) errors.timeSlot = 'Pilih salah satu jam sesi.';

  return errors;
}

export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
export const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateProofFile(file: File): string | null {
  if (!PROOF_TYPES.includes(file.type)) return 'Bukti harus berupa gambar JPG, PNG, atau WebP.';
  if (file.size > MAX_PROOF_BYTES) return 'Ukuran bukti maksimal 5 MB.';
  return null;
}

export function dpAmount(total: number) {
  // Same rounding as the API, so the preview never disagrees with what is charged.
  return Math.ceil(total / 2);
}

export function featureList(features: unknown): string[] {
  return Array.isArray(features)
    ? features.filter((item): item is string => typeof item === 'string')
    : [];
}

/** "08:30 - 09:30" -> start, end and length in minutes, for a readable slot button. */
export function slotParts(slot: string) {
  const [start, end] = slot.split(' - ');
  const minutes = (value: string) => {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + m;
  };
  return { start, end, minutes: minutes(end) - minutes(start) };
}
