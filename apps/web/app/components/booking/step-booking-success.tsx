'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import type { Booking } from '@/lib/booking-api';
import { formatDay, formatRupiah, whatsappLink } from '@/lib/format';
import type { StudioInfo } from '@/lib/studio-api';
import { BookingButton } from './booking-button';
import type { SuccessStatus } from './resume';
import { StepCard, StepFooter, StepGrid } from './step-layout';
import { emeraldButtonClass } from './ui';

const COPY: Record<SuccessStatus, { title: string; message: string }> = {
  CONFIRMED: {
    title: 'Pembayaran Terkonfirmasi',
    message: 'Jadwal sesi fotomu sudah resmi terkonfirmasi. Invoice dikirim ke email kamu.',
  },
  PENDING_VERIFICATION: {
    title: 'Bukti Pembayaran Diterima',
    message: 'Bukti transfer sedang menunggu verifikasi admin studio dalam 1x24 jam.',
  },
  REJECTED: {
    title: 'Bukti Pembayaran Ditolak',
    message:
      'Admin menolak bukti transfermu dan slot sudah dilepas. Hubungi admin lewat WhatsApp untuk bantuan, atau pesan ulang.',
  },
};

export default function StepBookingSuccess({
  booking,
  mode,
  status,
  senderName,
  studio,
  onClose,
  onRestart,
}: {
  booking: Booking;
  mode: 'GATEWAY' | 'MANUAL';
  status: SuccessStatus;
  senderName: string;
  studio: StudioInfo | undefined;
  onClose: () => void;
  onRestart: () => void;
}) {
  const nominal = formatRupiah(booking.requiredAmount);
  const copy = COPY[status];
  const message =
    status === 'REJECTED'
      ? `Halo Admin Kayastory! Bukti transfer untuk Booking #${booking.bookingCode} a.n. ${senderName} ditolak. Mohon bantuannya ya kak. Terima kasih! 📸`
      : status === 'CONFIRMED'
        ? `Halo Admin Kayastory! Saya sudah membayar Booking #${booking.bookingCode} a.n. ${senderName} sebesar ${nominal}. Terima kasih! 📸`
        : `Halo Admin Kayastory! Saya sudah transfer untuk Booking #${booking.bookingCode} a.n. ${senderName} sebesar ${nominal}. Mohon bantu verifikasinya ya kak, ini bukti transfernya. Terima kasih! 📸`;

  return (
    <div className="text-sm">
      <StepGrid>
        <StepCard index={1} title="Status Reservasi" className="items-center text-center">
          {status === 'REJECTED' ? (
            <XCircle className="size-14 text-red-300" aria-hidden />
          ) : (
            <CheckCircle2 className="size-14 text-emerald-400" aria-hidden />
          )}
          <h3 className="mt-3 text-xl font-bold">{copy.title}</h3>
          <p className="mt-1 text-muted">{copy.message}</p>
          <div className="mt-5 w-full rounded-xl border border-accent/30 bg-accent/10 p-4">
            <p className="text-xs text-muted">Kode Booking</p>
            <p className="mt-1 text-2xl font-black tracking-wider text-accent">
              {booking.bookingCode}
            </p>
          </div>
        </StepCard>

        <StepCard index={2} title="Detail Reservasi" span="right">
          <dl className="space-y-3">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Paket</dt>
              <dd className="text-right font-medium">{booking.packageName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Jadwal</dt>
              <dd className="text-right font-medium">
                {formatDay(booking.sessionDate)} · {booking.timeSlot} WIB
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
              <dt className="text-muted">{mode === 'GATEWAY' ? 'Dibayar' : 'Ditransfer'}</dt>
              <dd className="font-bold tabular-nums text-accent">{nominal}</dd>
            </div>
          </dl>
          <p className="mt-auto pt-5 text-xs text-muted">
            Simpan kode booking ini untuk menanyakan status reservasi ke admin studio.
          </p>
        </StepCard>
      </StepGrid>

      <StepFooter>
        <BookingButton type="button" variant="outline" onClick={onClose}>
          Kembali ke Beranda
        </BookingButton>
        {status === 'REJECTED' && (
          <BookingButton type="button" variant="outline" onClick={onRestart}>
            Pesan Ulang
          </BookingButton>
        )}
        <a
          href={whatsappLink(studio?.whatsappNumber ?? '', message)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${emeraldButtonClass} sm:w-72`}
        >
          {status === 'PENDING_VERIFICATION'
            ? 'Konfirmasi Cepat ke WhatsApp CS'
            : 'Hubungi WhatsApp Studio'}
        </a>
      </StepFooter>
    </div>
  );
}
