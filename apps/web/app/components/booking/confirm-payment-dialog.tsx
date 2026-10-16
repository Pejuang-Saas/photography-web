'use client';

import { Clock, Lock } from 'lucide-react';
import type { PaymentMode, PaymentPlan } from '@/lib/api-types';
import { formatDay, formatDurationMinutes, formatRupiah } from '@/lib/format';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BookingButton } from './booking-button';

function deadlineText(mode: PaymentMode | undefined, minutes: number | undefined) {
  if (!minutes)
    return 'Selesaikan pembayaran sebelum batas waktu yang tertera di langkah berikutnya.';
  const action =
    mode === 'MANUAL' ? 'mentransfer dan mengunggah bukti' : 'menyelesaikan pembayaran';
  return `Kamu punya waktu ${formatDurationMinutes(minutes)} untuk ${action}.`;
}

/** Last stop before a slot is reserved, so nobody is surprised by landing on a payment screen. */
export default function ConfirmPaymentDialog({
  open,
  onOpenChange,
  pending,
  error,
  onConfirm,
  packageName,
  sessionDate,
  timeSlot,
  plan,
  amount,
  mode,
  paymentWindowMinutes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  packageName: string;
  sessionDate: string;
  timeSlot: string;
  plan: PaymentPlan;
  amount: number;
  mode: PaymentMode | undefined;
  paymentWindowMinutes: number | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      {/* Rendered in a portal outside the checkout wrapper, so the dark tokens are set again here. */}
      <DialogContent
        showCloseButton={false}
        className="dark w-[92vw] max-w-md gap-0 rounded-2xl border-white/10 bg-[#151413] p-0 text-fg shadow-2xl"
      >
        <div className="space-y-5 p-6 [--primary:#d9a521] [--primary-foreground:#070707] [--ring:#d9a521]">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-xl font-bold">Lanjut ke pembayaran?</DialogTitle>
            <DialogDescription className="text-sm text-muted">
              Periksa sekali lagi. Setelah kamu lanjut, jadwal ini langsung dikunci untukmu.
            </DialogDescription>
          </DialogHeader>

          <dl className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Paket</dt>
              <dd className="text-right font-medium">{packageName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Jadwal</dt>
              <dd className="text-right font-medium tabular-nums">
                {formatDay(sessionDate)} · {timeSlot} WIB
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Skema</dt>
              <dd className="text-right font-medium">
                {plan === 'FULL' ? 'Bayar Lunas 100%' : 'Bayar DP 50%'}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-white/10 pt-3">
              <dt className="text-muted">Dibayar sekarang</dt>
              <dd className="text-xl font-black tabular-nums text-accent">
                {formatRupiah(amount)}
              </dd>
            </div>
          </dl>

          <ul className="space-y-2 text-xs text-muted">
            <li className="flex gap-2.5">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-accent" />
              Slot jadwalmu dikunci begitu kamu melanjutkan.
            </li>
            <li className="flex gap-2.5">
              <Clock className="mt-0.5 size-3.5 shrink-0 text-accent" />
              <span>
                {deadlineText(mode, paymentWindowMinutes)} Jika terlewat, slot dilepas otomatis dan
                kamu perlu memesan ulang.
              </span>
            </li>
          </ul>

          {error && (
            <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <BookingButton
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Periksa Lagi
            </BookingButton>
            <BookingButton type="button" className="sm:w-60" onClick={onConfirm} disabled={pending}>
              {pending ? 'Mengunci slot...' : 'Ya, Lanjut Bayar'}
            </BookingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
