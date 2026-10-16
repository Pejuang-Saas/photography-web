export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** `sessionDate` arrives as an ISO timestamp for a date-only column; keep just YYYY-MM-DD. */
export function toDay(iso: string): string {
  return iso.slice(0, 10);
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${toDay(iso)}T00:00:00Z`));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(iso));
}

/** Today in the studio's timezone (WIB), as YYYY-MM-DD. */
export function todayWib(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

export function whatsappLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, '').replace(/^0/, '62');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** Same normalisation the API applies: digits only, leading 0 becomes 62. */
export function normalizeWhatsapp(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
}

/** "08:00" -> "08.00", the way Indonesian opening hours are usually written. */
export function formatClock(time: string): string {
  return time.replace(':', '.');
}

/** 45 -> "45 menit", 180 -> "3 jam", 90 -> "1 jam 30 menit". */
export function formatDurationMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} menit`;
  return minutes === 0 ? `${hours} jam` : `${hours} jam ${minutes} menit`;
}

/** Milliseconds as a countdown: "2:59:41" from one hour up, otherwise "59:41". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
