'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ExternalLink, LoaderCircle } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import type { GatewayProvider } from '@/lib/api-types';
import { bookingApi, type Booking, type GatewayIntent } from '@/lib/booking-api';
import { formatRupiah } from '@/lib/format';
import { useDeadline } from '@/lib/use-deadline';
import { useIdempotencyKey } from '@/lib/use-idempotency-key';
import { ExpiredNotice, PaymentCountdown } from './payment-countdown';
import { BookingButton } from './booking-button';
import { StepCard, StepGrid } from './step-layout';

const POLL_MS = 4000;
const DEAD_STATUSES = ['EXPIRED', 'CANCELLED', 'REJECTED'];

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : 'Pembayaran belum berhasil diproses.';
}

export default function StepGatewayPayment({
  booking,
  deadline,
  provider,
  initialRedirectUrl,
  onConfirmed,
  onRestart,
}: {
  booking: Booking;
  deadline: number | null;
  provider: GatewayProvider | null;
  /** Pay page that was already opened before a refresh, so no second transaction is created. */
  initialRedirectUrl: string | null;
  onConfirmed: () => void;
  onRestart: () => void;
}) {
  const keyFor = useIdempotencyKey();
  const remaining = useDeadline(deadline);
  const [intent, setIntent] = useState<GatewayIntent | null>(() =>
    initialRedirectUrl
      ? { paymentId: '', orderId: null, provider, redirectUrl: initialRedirectUrl }
      : null,
  );
  const [simulatedFailure, setSimulatedFailure] = useState(false);
  const notified = useRef(false);

  const createIntent = useMutation({
    mutationFn: () => bookingApi.createGatewayIntent(booking.id, keyFor(`intent:${booking.id}`)),
    onSuccess: setIntent,
  });

  // Development-only simulation; the API refuses this endpoint for real providers and in production.
  const confirmMock = useMutation({
    mutationFn: () =>
      bookingApi.confirmMockGatewayPayment(booking.id, keyFor(`mock:${booking.id}`)),
    onSuccess: onConfirmed,
  });

  // A real gateway confirms through its webhook, so the page can only watch the booking status.
  const status = useQuery({
    queryKey: ['public', 'booking', booking.bookingCode],
    queryFn: () => bookingApi.getPublicBooking(booking.bookingCode),
    enabled: Boolean(intent),
    refetchInterval: POLL_MS,
  });

  const bookingStatus = status.data?.status;
  useEffect(() => {
    if (bookingStatus === 'CONFIRMED' && !notified.current) {
      notified.current = true;
      onConfirmed();
    }
  }, [bookingStatus, onConfirmed]);

  const dead = remaining === 0 || Boolean(bookingStatus && DEAD_STATUSES.includes(bookingStatus));

  const summary = (
    <StepCard index={1} title="Ringkasan Pembayaran">
      <div className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-center text-sm">
        <p className="text-xs text-muted">Total pembayaran</p>
        <p className="mt-1 text-2xl font-black tabular-nums text-accent">
          {formatRupiah(booking.requiredAmount)}
        </p>
        {remaining !== null && (
          <div className="mt-3 border-t border-accent/20 pt-3">
            <PaymentCountdown remainingMs={remaining} expiresAt={booking.expiresAt} />
          </div>
        )}
      </div>
      <p className="mt-4 text-xs text-muted">
        Kode reservasi <strong className="text-fg">{booking.bookingCode}</strong>. Slot jadwalmu
        ditahan sementara sampai pembayaran selesai.
      </p>
    </StepCard>
  );

  if (dead) return <ExpiredNotice onRestart={onRestart} />;

  if (provider === 'MOCK') {
    return (
      <StepGrid>
        {summary}
        <StepCard index={2} title="Simulasi Payment Gateway" span="right" className="gap-3 text-sm">
          <p className="text-xs text-muted">
            Mode pengembangan: pilih hasil pembayaran untuk menguji alur tanpa gateway sungguhan.
          </p>
          {(simulatedFailure || confirmMock.isError) && (
            <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-red-200">
              {confirmMock.isError
                ? errorText(confirmMock.error)
                : 'Pembayaran simulasi dibatalkan. Kamu bisa mencoba lagi.'}
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <BookingButton
              type="button"
              disabled={confirmMock.isPending}
              onClick={() => {
                setSimulatedFailure(false);
                confirmMock.mutate();
              }}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {confirmMock.isPending ? 'Memproses...' : 'Simulasikan Bayar Berhasil'}
            </BookingButton>
            <BookingButton
              type="button"
              variant="outline"
              disabled={confirmMock.isPending}
              onClick={() => setSimulatedFailure(true)}
              className="border-red-400/40 text-red-300 hover:bg-red-400/10"
            >
              Simulasikan Gagal / Batal
            </BookingButton>
          </div>
        </StepCard>
      </StepGrid>
    );
  }

  return (
    <StepGrid>
      {summary}
      <StepCard index={2} title="Bayar Sekarang" span="right" className="gap-4 text-sm">
        {!intent ? (
          <>
            <p className="text-xs text-muted">
              Kamu akan diarahkan ke halaman pembayaran aman{' '}
              {provider ? `(${provider === 'MIDTRANS' ? 'Midtrans' : 'Xendit'})` : ''}. Setelah
              membayar, kembali ke halaman ini dan status akan terkonfirmasi otomatis.
            </p>
            {createIntent.isError && (
              <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-red-200">
                {errorText(createIntent.error)}
              </p>
            )}
            <BookingButton
              type="button"
              className="sm:w-72"
              disabled={createIntent.isPending}
              onClick={() => createIntent.mutate()}
            >
              {createIntent.isPending ? 'Menyiapkan pembayaran...' : 'Bayar Sekarang'}
            </BookingButton>
          </>
        ) : (
          <div className="space-y-3">
            {intent.redirectUrl && (
              <a
                href={intent.redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-accent-fg hover:bg-accent-light sm:w-72"
              >
                Buka Halaman Pembayaran
                <ExternalLink className="size-4" />
              </a>
            )}
            <p className="flex items-center gap-2 text-xs text-muted" aria-live="polite">
              <LoaderCircle className="size-3.5 animate-spin" />
              Menunggu konfirmasi pembayaran...
            </p>
          </div>
        )}
      </StepCard>
    </StepGrid>
  );
}
