'use client';

import { Camera, MapPin, ShieldCheck } from 'lucide-react';
import type { ServicePackage } from '@/lib/booking-api';
import type { PaymentPlan } from '@/lib/api-types';
import { dpAmount, featureList, type CustomerForm } from '@/lib/booking-form';
import { formatDay, formatRupiah } from '@/lib/format';
import type { StudioInfo } from '@/lib/studio-api';
import { Button } from '@/components/ui/button';

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

  return (
    <div className="space-y-5">
      <section
        aria-label="Ringkasan pesanan"
        className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm"
      >
        <div>
          <h3 className="font-bold">{packageItem.name}</h3>
          {features.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-muted">
              {features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-1.5 border-t border-white/10 pt-3">
          <Row label="Tanggal">{formatDay(form.sessionDate)}</Row>
          <Row label="Jam">{form.timeSlot} WIB</Row>
          <Row label="Nama">{form.customerName}</Row>
          <Row label="WhatsApp">{form.customerPhone}</Row>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-3">
          <span className="text-muted">Total paket</span>
          <span className="font-bold">{formatRupiah(packageItem.price)}</span>
        </div>
      </section>

      <fieldset className="space-y-2 text-sm">
        <legend className="mb-1 text-muted">Skema pembayaran *</legend>
        {options.map((option) => (
          <label
            key={option.value}
            className={`block cursor-pointer rounded-xl border p-3 transition-colors ${
              plan === option.value
                ? 'border-accent bg-accent/10'
                : 'border-white/10 hover:border-white/25'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="paymentPlan"
                className="size-4 accent-amber-500"
                checked={plan === option.value}
                onChange={() => onPlanChange(option.value)}
              />
              <span className="flex-1 font-medium">{option.title}</span>
              <span className="font-bold text-accent">{formatRupiah(option.amount)}</span>
            </div>
            <p className="mt-1 pl-7 text-xs text-muted">{option.note}</p>
          </label>
        ))}
      </fieldset>

      <section
        aria-label="Jaminan dan identitas studio"
        className="space-y-3 rounded-2xl border border-accent/30 bg-accent/[0.06] p-4 text-sm"
      >
        <h3 className="flex items-center gap-2 font-bold">
          <ShieldCheck className="size-4 text-accent" />
          Dipesan langsung ke {studio?.studioName ?? 'studio resmi kami'}
        </h3>

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
          <ul className="flex flex-wrap gap-2">
            {studio.guarantees.map((guarantee) => (
              <li
                key={guarantee}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px]"
              >
                ✓ {guarantee}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <p className="text-xs text-muted">
        Menekan tombol di bawah mengunci slot jadwalmu sementara sampai pembayaran selesai.
      </p>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={pending}>
          Ubah Data
        </Button>
        <Button type="button" className="flex-1" onClick={onNext} disabled={pending}>
          {pending ? 'Mengunci slot...' : 'Lanjut ke Pembayaran →'}
        </Button>
      </div>
    </div>
  );
}
