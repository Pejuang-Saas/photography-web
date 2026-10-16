'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, Copy, Upload } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { bookingApi, type Booking, type ManualPaymentAccount } from '@/lib/booking-api';
import { validateProofFile } from '@/lib/booking-form';
import { formatRupiah, whatsappLink } from '@/lib/format';
import type { StudioInfo } from '@/lib/studio-api';
import { useDeadline } from '@/lib/use-deadline';
import { useIdempotencyKey } from '@/lib/use-idempotency-key';
import { ExpiredNotice, PaymentCountdown } from './payment-countdown';
import { BookingButton } from './booking-button';
import { Field, labelClass, StepCard, StepFooter, StepGrid } from './step-layout';
import { fieldCompactClass } from './ui';

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] hover:border-white/25"
    >
      {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
      {copied ? 'Tersalin' : 'Salin Nomor'}
    </button>
  );
}

export default function StepManualPayment({
  booking,
  deadline,
  onRestart,
  accounts,
  studio,
  onSubmitted,
}: {
  booking: Booking;
  deadline: number | null;
  onRestart: () => void;
  accounts: ManualPaymentAccount[];
  studio: StudioInfo | undefined;
  onSubmitted: (senderName: string) => void;
}) {
  const keyFor = useIdempotencyKey();
  const remaining = useDeadline(deadline);
  const expired = remaining === 0;
  const [accountId, setAccountId] = useState(
    () => (accounts.find((account) => account.isPrimary) ?? accounts[0])?.id ?? '',
  );
  const [senderName, setSenderName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const selected = accounts.find((account) => account.id === accountId);

  const submit = useMutation({
    mutationFn: () => {
      const body = new FormData();
      body.set('manualAccountId', accountId);
      body.set('senderName', senderName.trim());
      body.set('amount', String(booking.requiredAmount));
      body.set('file', file!);
      const signature = [
        accountId,
        senderName.trim(),
        file!.name,
        file!.size,
        file!.lastModified,
      ].join('|');
      return bookingApi.submitManualPayment(booking.id, body, keyFor(signature));
    },
    onSuccess: () => onSubmitted(senderName.trim()),
  });

  function handleFile(next: File | undefined) {
    if (!next) return;
    const problem = validateProofFile(next);
    setFileError(problem);
    if (problem) {
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  const canSubmit = Boolean(accountId && file && senderName.trim().length >= 2) && !expired;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) submit.mutate();
  }

  if (expired) return <ExpiredNotice onRestart={onRestart} />;

  if (accounts.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm">
        <p>
          Rekening pembayaran belum tersedia. Reservasi kamu tetap tercatat dengan kode{' '}
          <strong>{booking.bookingCode}</strong>, hubungi admin untuk melanjutkan pembayaran.
        </p>
        <a
          href={whatsappLink(
            studio?.whatsappNumber ?? '',
            `Halo Admin Kayastory! Saya sudah reservasi dengan kode ${booking.bookingCode}, mohon info rekening pembayarannya.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
        >
          Hubungi Admin via WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="text-sm">
      <StepGrid>
        <StepCard index={1} title="Nominal & Rekening Tujuan">
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-center">
            <p className="text-xs text-muted">Nominal yang harus ditransfer</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-accent">
              {formatRupiah(booking.requiredAmount)}
            </p>
            {remaining !== null && (
              <div className="mt-3 border-t border-accent/20 pt-3">
                <PaymentCountdown remainingMs={remaining} expiresAt={booking.expiresAt} />
              </div>
            )}
          </div>

          <fieldset className="mt-4 space-y-2">
            <legend className="sr-only">Transfer ke rekening</legend>
            {accounts.map((account) => (
              <label
                key={account.id}
                className={`block cursor-pointer rounded-xl border p-3 transition-colors ${
                  accountId === account.id
                    ? 'border-accent bg-accent/10'
                    : 'border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="manualAccount"
                    className="mt-1 size-4 accent-amber-500"
                    checked={accountId === account.id}
                    onChange={() => setAccountId(account.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{account.bankName}</p>
                    <p className="text-base font-semibold tabular-nums tracking-wide">
                      {account.accountNumber}
                    </p>
                    <p className="text-xs text-muted">a.n. {account.accountHolder}</p>
                  </div>
                  <CopyButton value={account.accountNumber} />
                </div>
              </label>
            ))}
          </fieldset>
        </StepCard>

        <StepCard index={2} title="Konfirmasi Bukti Transfer" span="right" className="gap-4">
          <Field label="Nama pemilik rekening pengirim *">
            <input
              className={fieldCompactClass}
              maxLength={120}
              value={senderName}
              onChange={(event) => setSenderName(event.target.value)}
              placeholder="Nama yang tertera di mutasi bank kamu"
            />
          </Field>

          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <div>
              <span className={`${labelClass} mb-2 [@media(min-height:900px)]:mb-3`}>
                Bukti transfer * (JPG, PNG, WebP, maks. 5 MB)
              </span>
              <label className="flex h-[clamp(9rem,22vh,16rem)] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 p-4 text-center text-xs text-muted transition-colors hover:border-white/40">
                <Upload className="size-6" />
                <span className="line-clamp-2 break-all">
                  {file ? file.name : 'Pilih foto struk dari galeri'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
              </label>
              {fileError && <p className="mt-1.5 text-xs text-red-300">{fileError}</p>}
            </div>

            <div>
              <span className={`${labelClass} mb-2 [@media(min-height:900px)]:mb-3`}>
                Pratinjau
              </span>
              <div className="flex h-[clamp(9rem,22vh,16rem)] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not optimizable
                  <img
                    src={preview}
                    alt="Pratinjau bukti transfer"
                    className="size-full object-contain"
                  />
                ) : (
                  <span className="px-4 text-center text-xs text-muted-dim">
                    Struk yang kamu pilih tampil di sini
                  </span>
                )}
              </div>
            </div>
          </div>

          {submit.isError && (
            <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-red-200">
              {submit.error instanceof ApiError
                ? submit.error.message
                : 'Bukti belum berhasil dikirim. Silakan coba lagi.'}
            </p>
          )}
        </StepCard>
      </StepGrid>

      <StepFooter
        hint={
          selected
            ? `Pastikan nominal dan rekening tujuan (${selected.bankName}) sudah sesuai sebelum mengirim.`
            : undefined
        }
      >
        <BookingButton type="submit" className="sm:w-72" disabled={!canSubmit || submit.isPending}>
          {submit.isPending ? 'Mengirim bukti...' : 'Kirim Bukti Pembayaran'}
        </BookingButton>
      </StepFooter>
    </form>
  );
}
