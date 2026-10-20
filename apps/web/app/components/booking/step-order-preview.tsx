'use client';

import { useState } from 'react';
import { Camera, Check, MapPin, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { ServicePackage } from '@/lib/booking-api';
import type { PaymentMode, PaymentPlan } from '@/lib/api-types';
import { dpAmount, type CustomerForm } from '@/lib/booking-form';
import { formatDay, formatRupiah } from '@/lib/format';
import { packageLines, packageTerms, type OrderSummary } from '@/lib/package-details';
import type { StudioInfo } from '@/lib/studio-api';
import { BookingButton } from './booking-button';
import ConfirmPaymentDialog from './confirm-payment-dialog';
import { StepCard, StepColumn, StepFooter, StepGrid } from './step-layout';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 text-sm">
        <p className="mb-0.5 text-[11px] uppercase tracking-wider text-muted-dim">{label}</p>
        {children}
      </div>
    </div>
  );
}

export default function StepOrderPreview({
  packageItem,
  summary,
  form,
  plan,
  allowDownPayment,
  paymentMode,
  paymentWindowMinutes,
  studio,
  pending,
  error,
  onPlanChange,
  onBack,
  onNext,
}: {
  packageItem: ServicePackage;
  /** The package and the add-ons the customer picked, with what they add up to. */
  summary: OrderSummary;
  form: CustomerForm;
  plan: PaymentPlan;
  allowDownPayment: boolean;
  paymentMode: PaymentMode | undefined;
  paymentWindowMinutes: number | undefined;
  studio: StudioInfo | undefined;
  pending: boolean;
  error: string | null;
  onPlanChange: (plan: PaymentPlan) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const features = packageLines(packageItem);
  const dp = dpAmount(summary.total);
  // The general conditions and this package's own, which the customer agrees to by booking.
  const terms = [...(studio?.reservationTerms ?? []), ...packageTerms(packageItem)];
  const [agreed, setAgreed] = useState(false);
  const needsAgreement = terms.length > 0;
  const options: Array<{ value: PaymentPlan; title: string; amount: number; note: string }> = [
    ...(allowDownPayment
      ? [
          {
            value: 'DP_50' as const,
            title: 'Bayar DP 50%',
            amount: dp,
            note: 'Sisa pelunasan dibayar di studio pada hari-H pemotretan.',
          },
        ]
      : []),
    {
      value: 'FULL',
      title: 'Bayar Lunas 100%',
      amount: summary.total,
      note: 'Bayar penuh di awal, tanpa tagihan tambahan di hari-H.',
    },
  ];

  const [confirmOpen, setConfirmOpen] = useState(false);
  const payNow = plan === 'FULL' ? summary.total : dp;

  return (
    <div>
      <StepGrid>
        <StepCard index={1} title="Ringkasan Pesanan" className="text-sm">
          <h3 className="text-base font-bold">{packageItem.name}</h3>
          {features.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 space-y-1.5 border-t border-white/10 pt-4">
            <Row label="Tanggal">{formatDay(form.sessionDate)}</Row>
            <Row label="Jam">
              {form.timeSlot} WIB
              {summary.extraMinutes > 0 && ` (+${summary.extraMinutes} menit)`}
            </Row>
            <Row label="Nama">{form.customerName}</Row>
            <Row label="WhatsApp">{form.customerPhone}</Row>
          </div>
          <div className="mt-auto space-y-1.5 border-t border-white/10 pt-4">
            <Row label={packageItem.name}>{formatRupiah(packageItem.price)}</Row>
            {summary.lines.map((line) => (
              <Row
                key={line.addOn.id}
                label={`${line.addOn.name} · ${line.quantity} × ${line.addOn.unitLabel}`}
              >
                {formatRupiah(line.subtotal)}
              </Row>
            ))}
            <div className="flex justify-between pt-1.5 text-base">
              <span className="font-semibold">Total</span>
              <span className="font-black text-accent">{formatRupiah(summary.total)}</span>
            </div>
          </div>
        </StepCard>

        <StepColumn>
          <StepCard index={2} title="Skema Pembayaran" span="none">
            <fieldset
              className={`grid gap-3 text-sm ${options.length > 1 ? 'sm:grid-cols-2' : ''}`}
            >
              <legend className="sr-only">Skema pembayaran</legend>
              {options.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-colors ${
                    plan === option.value
                      ? 'border-accent bg-accent/10'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="paymentPlan"
                      className="size-4 accent-amber-500"
                      checked={plan === option.value}
                      onChange={() => onPlanChange(option.value)}
                    />
                    <span className="flex-1 font-semibold">{option.title}</span>
                  </span>
                  <span className="pl-6.5 text-lg font-black text-accent">
                    {formatRupiah(option.amount)}
                  </span>
                  <span className="pl-6.5 text-xs text-muted">{option.note}</span>
                </label>
              ))}
            </fieldset>
          </StepCard>

          <StepCard
            index={3}
            title={`Dipesan langsung ke ${studio?.studioName ?? 'studio resmi kami'}`}
            span="none"
            className="border-accent/30 bg-accent/[0.05]"
          >
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-8">
              {(studio?.address || studio?.instagramUrl) && (
                <div className="space-y-4">
                  {studio.address && (
                    <InfoItem icon={MapPin} label="Alamat studio">
                      <p className="leading-snug">{studio.address}</p>
                      {studio.mapsUrl && (
                        <a
                          href={studio.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-block text-xs text-accent underline-offset-2 hover:underline"
                        >
                          Lihat di peta ↗
                        </a>
                      )}
                    </InfoItem>
                  )}
                  {studio.instagramUrl && (
                    <InfoItem icon={Camera} label="Instagram resmi">
                      <a
                        href={studio.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline-offset-2 hover:text-accent hover:underline"
                      >
                        @{studio.instagramHandle}
                      </a>
                      <p className="mt-0.5 text-xs text-muted">Cek portofolio klien asli</p>
                    </InfoItem>
                  )}
                </div>
              )}

              {studio && studio.guarantees.length > 0 && (
                <div className="sm:border-l sm:border-white/10 sm:pl-8">
                  <p className="mb-3 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-dim">
                    <ShieldCheck className="size-3.5 text-accent" />
                    Jaminan studio
                  </p>
                  <ul className="space-y-2.5 text-sm">
                    {studio.guarantees.map((guarantee) => (
                      <li key={guarantee} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
                          <Check className="size-2.5" strokeWidth={3} />
                        </span>
                        <span className="leading-snug">{guarantee}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </StepCard>
        </StepColumn>
      </StepGrid>

      {needsAgreement && (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
              <span>Ketentuan reservasi ({terms.length})</span>
              <span className="text-xs font-normal text-accent group-open:hidden">Baca</span>
              <span className="hidden text-xs font-normal text-accent group-open:inline">
                Tutup
              </span>
            </summary>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
              {terms.map((term) => (
                <li key={term} className="flex gap-2">
                  <span className="text-accent">•</span>
                  {term}
                </li>
              ))}
            </ul>
          </details>
          <label className="mt-4 flex cursor-pointer items-start gap-2.5 border-t border-white/10 pt-4">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-amber-500"
            />
            <span className="text-xs leading-relaxed">
              Saya sudah membaca dan menyetujui seluruh ketentuan reservasi di atas.
            </span>
          </label>
        </section>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <StepFooter
        hint={
          needsAgreement && !agreed
            ? 'Setujui ketentuan reservasi untuk melanjutkan.'
            : 'Kamu akan diminta konfirmasi sebelum slot dikunci dan pembayaran dimulai.'
        }
      >
        <BookingButton type="button" variant="outline" onClick={onBack} disabled={pending}>
          Ubah Data
        </BookingButton>
        <BookingButton
          type="button"
          className="sm:w-72"
          onClick={() => setConfirmOpen(true)}
          disabled={pending || (needsAgreement && !agreed)}
        >
          Lanjut ke Pembayaran →
        </BookingButton>
      </StepFooter>

      <ConfirmPaymentDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        pending={pending}
        error={error}
        onConfirm={onNext}
        packageName={packageItem.name}
        sessionDate={form.sessionDate}
        timeSlot={form.timeSlot}
        plan={plan}
        amount={payNow}
        mode={paymentMode}
        paymentWindowMinutes={paymentWindowMinutes}
      />
    </div>
  );
}
