import { Clock, TimerOff } from 'lucide-react';
import { formatCountdown, formatDateTime } from '@/lib/format';
import { BookingButton } from './booking-button';

const WARNING_MS = 5 * 60_000;

/** Time left to pay, turning red in the last five minutes. */
export function PaymentCountdown({
  remainingMs,
  expiresAt,
}: {
  remainingMs: number;
  expiresAt: string | null;
}) {
  const urgent = remainingMs <= WARNING_MS;

  return (
    <div className="text-center" role="timer" aria-live="off">
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
        <Clock className="size-3.5" />
        Sisa waktu pembayaran
      </p>
      <p
        className={`mt-1 text-3xl font-black tabular-nums ${
          urgent ? 'text-red-300' : 'text-accent'
        }`}
      >
        {formatCountdown(remainingMs)}
      </p>
      {expiresAt && (
        <p className="mt-1 text-xs text-muted">Batas {formatDateTime(expiresAt)} WIB</p>
      )}
      {urgent && (
        <p className="mt-2 text-xs text-red-300">
          Waktu hampir habis. Setelah itu slot dilepas otomatis.
        </p>
      )}
    </div>
  );
}

/** Shown instead of the payment form once the deadline has passed. */
export function ExpiredNotice({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-8 text-center">
      <TimerOff className="size-10 text-red-300" aria-hidden />
      <h2 className="text-lg font-bold">Waktu pembayaran habis</h2>
      <p className="max-w-md text-sm text-muted">
        Slot jadwalmu sudah dilepas karena pembayaran belum selesai tepat waktu. Datamu masih
        tersimpan, jadi kamu bisa langsung memilih jadwal lagi.
      </p>
      <BookingButton type="button" className="mt-2 sm:w-72" onClick={onRestart}>
        Pesan Ulang
      </BookingButton>
    </div>
  );
}
