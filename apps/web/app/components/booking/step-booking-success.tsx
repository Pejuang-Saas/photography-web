'use client';

import { CheckCircle2 } from 'lucide-react';
import type { Booking } from '@/lib/booking-api';
import { formatDay, formatRupiah, whatsappLink } from '@/lib/format';
import type { StudioInfo } from '@/lib/studio-api';
import { Button } from '@/components/ui/button';

export default function StepBookingSuccess({
  booking,
  mode,
  senderName,
  studio,
  onClose,
}: {
  booking: Booking;
  mode: 'GATEWAY' | 'MANUAL';
  senderName: string;
  studio: StudioInfo | undefined;
  onClose: () => void;
}) {
  const nominal = formatRupiah(booking.requiredAmount);
  const message =
    mode === 'MANUAL'
      ? `Halo Admin Kayastory! Saya sudah transfer untuk Booking #${booking.bookingCode} a.n. ${senderName} sebesar ${nominal}. Mohon bantu verifikasinya ya kak, ini bukti transfernya. Terima kasih! 📸`
      : `Halo Admin Kayastory! Saya sudah membayar Booking #${booking.bookingCode} a.n. ${senderName} sebesar ${nominal}. Terima kasih! 📸`;

  return (
    <div className="space-y-5 text-center text-sm">
      <CheckCircle2 className="mx-auto size-14 text-emerald-400" aria-hidden />
      <div>
        <h3 className="text-xl font-bold">
          {mode === 'GATEWAY' ? 'Pembayaran Berhasil' : 'Bukti Pembayaran Diterima'}
        </h3>
        <p className="mt-1 text-muted">
          {mode === 'GATEWAY'
            ? 'Jadwal sesi fotomu sudah resmi terkonfirmasi otomatis. Invoice dikirim ke email kamu.'
            : 'Bukti transfer sedang menunggu verifikasi admin studio dalam 1x24 jam.'}
        </p>
      </div>

      <div className="rounded-2xl border border-accent/30 bg-accent/10 p-5">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">Kode Booking</p>
        <p className="mt-2 text-2xl font-black tracking-wider text-accent">{booking.bookingCode}</p>
        <p className="mt-1 text-xs text-muted">
          Simpan kode ini untuk menanyakan status reservasi.
        </p>
      </div>

      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
        <div className="flex justify-between gap-4">
          <span className="text-muted">Paket</span>
          <span className="text-right font-medium">{booking.packageName}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Jadwal</span>
          <span className="text-right font-medium">
            {formatDay(booking.sessionDate)} · {booking.timeSlot} WIB
          </span>
        </div>
        <div className="flex justify-between gap-4 border-t border-white/10 pt-2">
          <span className="text-muted">{mode === 'GATEWAY' ? 'Dibayar' : 'Ditransfer'}</span>
          <span className="font-bold text-accent">{nominal}</span>
        </div>
      </div>

      <div className="space-y-2">
        <a
          href={whatsappLink(studio?.whatsappNumber ?? '', message)}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"
        >
          {mode === 'MANUAL' ? 'Konfirmasi Cepat ke WhatsApp CS Studio' : 'Hubungi WhatsApp Studio'}
        </a>
        <Button type="button" variant="outline" className="w-full" onClick={onClose}>
          Tutup dan Kembali ke Beranda
        </Button>
      </div>
    </div>
  );
}
