'use client';

import React, { useState } from 'react';
import { useAdmin } from '@/lib/admin-context';
import {
  errorMessage,
  useAdminBooking,
  useRejectPayment,
  useVerifyPayment,
} from '@/lib/admin-queries';
import type { AdminBooking } from '@/lib/admin-api';
import { bookingBadge, latestManualPayment } from '@/lib/booking-status';
import { formatDateTime, formatDay, formatRupiah, whatsappLink } from '@/lib/format';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  MessageCircle,
  FileText,
  CreditCard,
  ZoomIn,
  Clock,
} from 'lucide-react';
import { QueryError, QueryLoading } from './query-state';

export default function BookingDetailModal() {
  const { selectedBookingId, setSelectedBooking, setSelectedInvoice } = useAdmin();
  const booking = useAdminBooking(selectedBookingId);
  const close = () => setSelectedBooking(null);

  return (
    <Dialog open={Boolean(selectedBookingId)} onOpenChange={(open) => !open && close()}>
      <DialogContent className="w-[95vw] max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-0 text-zinc-900 dark:text-zinc-100 shadow-2xl rounded-2xl">
        <DialogTitle className="sr-only">Detail reservasi</DialogTitle>
        {booking.isLoading && (
          <div className="p-6">
            <QueryLoading rows={4} />
          </div>
        )}
        {booking.isError && (
          <div className="p-6">
            <QueryError
              title="Detail reservasi tidak dapat dimuat"
              message={errorMessage(booking.error)}
              retry={() => booking.refetch()}
            />
          </div>
        )}
        {booking.data && (
          // Keyed by booking id so the verify/reject form resets when another booking is opened.
          <BookingDetail
            key={booking.data.id}
            booking={booking.data}
            onClose={close}
            onOpenInvoice={() => setSelectedInvoice(booking.data)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BookingDetail({
  booking,
  onClose,
  onOpenInvoice,
}: {
  booking: AdminBooking;
  onClose: () => void;
  onOpenInvoice: () => void;
}) {
  const verify = useVerifyPayment();
  const reject = useRejectPayment();
  const proofPayment = latestManualPayment(booking);

  const [plan, setPlan] = useState<'DP_50' | 'FULL'>(booking.paymentPlan);
  const [amount, setAmount] = useState<string>(
    String(proofPayment?.amount ?? booking.requiredAmount),
  );
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);

  const badge = bookingBadge(booking);
  const awaitingVerification = booking.status === 'PENDING_VERIFICATION';
  const minimum = plan === 'FULL' ? booking.totalAmount : booking.requiredAmount;
  const amountValue = Number(amount);
  const amountValid = Number.isInteger(amountValue) && amountValue >= minimum;
  const busy = verify.isPending || reject.isPending;
  const actionError = verify.error ?? reject.error;

  const handleVerify = () => {
    verify.mutate(
      { id: booking.id, paymentPlan: plan, amount: amountValue },
      { onSuccess: onClose },
    );
  };

  const handleReject = () => {
    if (rejectReason.trim().length < 3) {
      setShowRejectInput(true);
      return;
    }
    reject.mutate({ id: booking.id, reason: rejectReason.trim() }, { onSuccess: onClose });
  };

  return (
    <>
      <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/40">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              {booking.bookingCode}
            </h2>
            <Badge className={`${badge.className} text-[10px] font-bold`}>{badge.label}</Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Dibuat pada {formatDateTime(booking.createdAt)} WIB
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={whatsappLink(booking.customerPhone, `Halo kak ${booking.customerName}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-sm"
          >
            <MessageCircle className="size-3.5" />
            Chat WA
          </a>

          {booking.invoice && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenInvoice}
              className="h-8 gap-1.5 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <FileText className="size-3.5" />
              Lihat Invoice
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
        <div className="md:col-span-7 space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="size-3.5" /> Data Klien
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-zinc-500 block text-[11px]">Nama Klien</span>
                <span className="font-semibold text-zinc-900 dark:text-white text-sm">
                  {booking.customerName}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[11px]">No. WhatsApp</span>
                <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                  {booking.customerPhone}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-zinc-500 block text-[11px]">Email</span>
                <span className="text-zinc-800 dark:text-zinc-200">{booking.customerEmail}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="size-3.5" /> Paket Photoshoot & Jadwal
            </h3>

            <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div>
                <span className="font-semibold text-zinc-900 dark:text-white block">
                  {booking.packageName}
                </span>
                <span className="text-[11px] text-zinc-500">Harga paket</span>
              </div>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {formatRupiah(booking.packagePrice)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="text-zinc-500 block text-[11px]">Tanggal Sesi</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {formatDay(booking.sessionDate)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[11px]">Slot Waktu</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-200">
                  {booking.timeSlot} WIB
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[11px]">Metode Pembayaran</span>
                <span className="text-zinc-800 dark:text-zinc-300">
                  {booking.paymentMode === 'GATEWAY' ? 'Payment Gateway' : 'Transfer Manual'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[11px]">Skema</span>
                <span className="text-zinc-800 dark:text-zinc-300">
                  {booking.paymentPlan === 'FULL' ? 'Bayar Lunas' : 'DP 50%'} ·{' '}
                  {formatRupiah(booking.requiredAmount)}
                </span>
              </div>
              {booking.expiresAt && booking.status === 'PENDING_PAYMENT' && (
                <div className="col-span-2 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                  <Clock className="size-3" />
                  Slot dilepas otomatis {formatDateTime(booking.expiresAt)} WIB jika belum dibayar
                </div>
              )}
            </div>

            {booking.notes && (
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900/80 p-2.5 text-xs text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block">
                  Catatan Klien:
                </span>
                {booking.notes}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Total Biaya Reservasi:
              </span>
              <span className="text-base font-mono font-bold text-zinc-900 dark:text-white">
                {formatRupiah(booking.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="md:col-span-5 space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="size-3.5" /> Pembayaran
              </h3>
              {proofPayment?.manualAccount && (
                <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                  {proofPayment.manualAccount.bankName}
                </span>
              )}
            </div>

            {proofPayment?.proof?.url ? (
              <div className="relative group overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed storage URL */}
                <img
                  src={proofPayment.proof.url}
                  alt="Bukti Transfer"
                  className={`w-full object-cover transition-transform duration-200 ${
                    isZoomed
                      ? 'scale-150 cursor-zoom-out'
                      : 'h-52 cursor-zoom-in group-hover:scale-105'
                  }`}
                  onClick={() => setIsZoomed(!isZoomed)}
                />
                <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-[10px] text-zinc-300 flex items-center gap-1 backdrop-blur-sm">
                  <ZoomIn className="size-3" /> Klik untuk Zoom
                </div>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-xs text-zinc-500">
                {booking.paymentMode === 'GATEWAY'
                  ? 'Pembayaran melalui payment gateway'
                  : 'Belum ada bukti transfer diunggah'}
              </div>
            )}

            {booking.payments.length > 0 ? (
              <ul className="space-y-2 text-xs pt-1">
                {booking.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5 space-y-1"
                  >
                    <div className="flex justify-between">
                      <span className="text-zinc-500">
                        {payment.method === 'GATEWAY'
                          ? (payment.provider ?? 'Gateway')
                          : 'Transfer Bank'}
                      </span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-white">
                        {formatRupiah(payment.amount)}
                      </span>
                    </div>
                    {payment.senderName && (
                      <div className="flex justify-between text-[11px] text-zinc-500">
                        <span>Pengirim</span>
                        <span>{payment.senderName}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px] text-zinc-500">
                      <span>{payment.status}</span>
                      <span className="font-mono">
                        {formatDateTime(payment.paidAt ?? payment.createdAt)} WIB
                      </span>
                    </div>
                    {payment.rejectionReason && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400">
                        Ditolak: {payment.rejectionReason}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-500">Belum ada pembayaran tercatat.</p>
            )}
          </div>

          {awaitingVerification && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 space-y-3.5 shadow-sm">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  Verifikasi Pembayaran
                </h4>
                <p className="text-[11px] text-zinc-500 leading-normal mt-0.5">
                  Mengunci slot jadwal dan menerbitkan invoice untuk {booking.customerName}.
                </p>
              </div>

              <div className="flex gap-2">
                {(
                  [
                    ['FULL', 'Lunas (Full)'],
                    ['DP_50', 'DP 50%'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setPlan(value);
                      setAmount(
                        String(value === 'FULL' ? booking.totalAmount : booking.requiredAmount),
                      );
                    }}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium border transition-colors ${
                      plan === value
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold border-zinc-900 dark:border-white shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label htmlFor="verified-amount" className="text-[11px] text-zinc-500">
                  Nominal diterima (min. {formatRupiah(minimum)})
                </label>
                <Input
                  id="verified-amount"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))}
                  className="h-9 font-mono text-xs"
                />
                {!amountValid && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">
                    Nominal kurang dari batas minimum untuk skema ini.
                  </p>
                )}
              </div>

              {showRejectInput && (
                <Textarea
                  placeholder="Alasan penolakan bukti transfer (min. 3 karakter)..."
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  maxLength={500}
                  className="text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white min-h-[55px]"
                />
              )}

              {actionError && (
                <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-300">
                  {errorMessage(actionError)}
                </p>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  onClick={handleVerify}
                  disabled={busy || !amountValid}
                  className="w-full h-9 rounded-lg bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-sm"
                >
                  <CheckCircle2 className="size-3.5 mr-1.5" />
                  {verify.isPending ? 'Memverifikasi...' : 'Verifikasi & Terbitkan Invoice'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReject}
                  disabled={busy}
                  className="w-full h-7 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <XCircle className="size-3 mr-1" />
                  {reject.isPending
                    ? 'Menolak...'
                    : showRejectInput
                      ? 'Kirim Penolakan'
                      : 'Tolak Bukti Transfer'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
