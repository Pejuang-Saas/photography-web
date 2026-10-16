'use client';

import { useState } from 'react';
import { Camera, MapPin, ShieldCheck } from 'lucide-react';
import type { ServicePackage } from '@/lib/booking-api';
import type { PaymentMode, PaymentPlan } from '@/lib/api-types';
import { dpAmount, featureList, type CustomerForm } from '@/lib/booking-form';
import { formatDay, formatRupiah } from '@/lib/format';
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

export default function StepOrderPreview({
  packageItem,
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
  const features = featureList(packageItem.features);
  const dp = dpAmount(packageItem.price);
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
      amount: packageItem.price,
      note: 'Bayar penuh di awal, tanpa tagihan tambahan di hari-H.',
    },
  ];

  const [confirmOpen, setConfirmOpen] = useState(false);
  const payNow = plan === 'FULL' ? packageItem.price : dp;

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
            <Row label="Jam">{form.timeSlot} WIB</Row>
            <Row label="Nama">{form.customerName}</Row>
            <Row label="WhatsApp">{form.customerPhone}</Row>
          </div>
          <div className="mt-auto flex justify-between border-t border-white/10 pt-4">
            <span className="text-muted">Total paket</span>
            <span className="font-bold">{formatRupiah(packageItem.price)}</span>
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
            <div className="space-y-2.5 text-sm">
              {studio?.address && (
                <p className="flex gap-2 text-xs">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-accent" />
                  <span>
                    {studio.address}
                    {studio.mapsUrl && (
                      <>
                        {' '}
                        <a
                          href={studio.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-accent"
                        >
                          Lihat di peta
                        </a>
                      </>
                    )}
                  </span>
                </p>
              )}

              {studio?.instagramUrl && (
                <p className="flex gap-2 text-xs">
                  <Camera className="mt-0.5 size-3.5 shrink-0 text-accent" />
                  <span>
                    Cek portofolio klien asli di{' '}
                    <a
                      href={studio.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline hover:text-accent"
                    >
                      @{studio.instagramHandle}
                    </a>
                  </span>
                </p>
              )}

              {studio && studio.guarantees.length > 0 && (
                <ul className="flex flex-wrap gap-2 pt-1">
                  {studio.guarantees.map((guarantee) => (
                    <li
                      key={guarantee}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px]"
                    >
                      <ShieldCheck className="size-3 text-accent" />
                      {guarantee}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </StepCard>
        </StepColumn>
      </StepGrid>

      {error && (
        <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <StepFooter hint="Kamu akan diminta konfirmasi sebelum slot dikunci dan pembayaran dimulai.">
        <BookingButton type="button" variant="outline" onClick={onBack} disabled={pending}>
          Ubah Data
        </BookingButton>
        <BookingButton
          type="button"
          className="sm:w-72"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
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
