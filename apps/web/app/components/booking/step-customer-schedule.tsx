'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Check, Clock, Minus, Plus } from 'lucide-react';
import { bookingApi, type AddOn, type ServicePackage } from '@/lib/booking-api';
import { slotParts, type CustomerErrors, type CustomerForm } from '@/lib/booking-form';
import { formatDay, formatRupiah } from '@/lib/format';
import { addOnPrice, summarizeOrder } from '@/lib/package-details';
import { sanitizePhoneInput } from '@/lib/phone';
import DatePicker from './date-picker';
import { BookingButton } from './booking-button';
import { Field, labelClass, StepCard, StepFooter, StepGrid } from './step-layout';
import { fieldCompactClass, textareaCompactClass } from './ui';

function Stepper({
  value,
  max,
  label,
  onChange,
}: {
  value: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
}) {
  const button =
    'flex size-8 items-center justify-center rounded-lg border border-white/15 text-fg transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/15 disabled:hover:text-fg';
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button
        type="button"
        className={button}
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
        aria-label={`Kurangi ${label}`}
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={button}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        aria-label={`Tambah ${label}`}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export default function StepCustomerSchedule({
  form,
  errors,
  notice,
  packageItem,
  addOns,
  onChange,
  onNext,
}: {
  form: CustomerForm;
  errors: CustomerErrors;
  notice?: string | null;
  packageItem: ServicePackage;
  /** The add-ons offered with this package. */
  addOns: AddOn[];
  onChange: (patch: Partial<CustomerForm>) => void;
  onNext: () => void;
}) {
  const scheduled = Boolean(form.sessionDate && form.timeSlot);
  const summary = summarizeOrder(packageItem, addOns, form.addOns);

  // Which times are free depends on the date, the package length and any time the add-ons add.
  const availability = useQuery({
    queryKey: ['public', 'availability', packageItem.id, form.sessionDate, summary.extraMinutes],
    queryFn: () =>
      bookingApi.getAvailability(form.sessionDate, packageItem.id, summary.extraMinutes),
    enabled: Boolean(form.sessionDate),
    staleTime: 15_000,
  });
  const slots = availability.data?.slots ?? [];
  const chosenStillFree = slots.some((item) => item.slot === form.timeSlot && item.available);

  // Longer time can squeeze the chosen slot out; it is dropped rather than left looking picked.
  useEffect(() => {
    if (form.timeSlot && availability.data && !chosenStillFree) onChange({ timeSlot: '' });
  }, [availability.data, chosenStillFree, form.timeSlot, onChange]);

  const setQuantity = (addOnId: string, quantity: number) => {
    const next = { ...form.addOns };
    if (quantity > 0) next[addOnId] = quantity;
    else delete next[addOnId];
    onChange({ addOns: next });
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
    >
      {notice && (
        <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2 text-sm text-amber-100">
          {notice}
        </p>
      )}

      <StepGrid>
        <StepCard index={1} title="Data Pemesan" className="gap-4 [@media(min-height:900px)]:gap-6">
          <Field label="Nama lengkap *" error={errors.customerName}>
            <input
              className={fieldCompactClass}
              maxLength={120}
              value={form.customerName}
              onChange={(event) => onChange({ customerName: event.target.value })}
              placeholder="Nama sesuai identitas"
              aria-invalid={Boolean(errors.customerName)}
            />
          </Field>
          <Field label="Nomor WhatsApp aktif *" error={errors.customerPhone}>
            <input
              className={fieldCompactClass}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.customerPhone}
              onChange={(event) =>
                onChange({ customerPhone: sanitizePhoneInput(event.target.value) })
              }
              placeholder="08xxxxxxxxxx"
              aria-invalid={Boolean(errors.customerPhone)}
            />
          </Field>
          <Field label="Email untuk konfirmasi invoice *" error={errors.customerEmail}>
            <input
              className={fieldCompactClass}
              type="email"
              maxLength={180}
              value={form.customerEmail}
              onChange={(event) => onChange({ customerEmail: event.target.value })}
              placeholder="nama@email.com"
              aria-invalid={Boolean(errors.customerEmail)}
            />
          </Field>
          <Field label="Catatan untuk fotografer (opsional)">
            <textarea
              className={textareaCompactClass}
              maxLength={1000}
              value={form.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              placeholder="Lokasi kampus, jumlah orang, atau konsep"
            />
          </Field>
        </StepCard>

        <StepCard index={addOns.length > 0 ? 3 : 2} title="Jadwal Sesi" span="right">
          <div className="flex flex-col gap-5 sm:flex-row [@media(min-height:900px)]:gap-8">
            <div className="space-y-1.5 sm:w-[clamp(15.75rem,35vh,21rem)] sm:shrink-0">
              <DatePicker
                value={form.sessionDate}
                onChange={(sessionDate) => onChange({ sessionDate })}
              />
              {errors.sessionDate && <p className="text-xs text-red-300">{errors.sessionDate}</p>}
            </div>

            <fieldset className="min-w-0 flex-1">
              <legend className={`${labelClass} mb-2 [@media(min-height:900px)]:mb-3`}>
                Pilih jam sesi *
              </legend>
              <p className="mb-3 text-xs text-muted">
                Jam yang tampil sesuai durasi paket ({packageItem.durationMinutes} menit)
                {summary.extraMinutes > 0 &&
                  `, ditambah ${summary.extraMinutes} menit dari tambahan yang kamu pilih`}
                .
              </p>

              {!form.sessionDate ? (
                <p className="rounded-xl border border-dashed border-white/15 px-3.5 py-6 text-center text-sm text-muted">
                  Pilih tanggal dulu untuk melihat jam yang tersedia.
                </p>
              ) : availability.isLoading ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 lg:grid-cols-2">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
                  ))}
                </div>
              ) : availability.isError ? (
                <p role="alert" className="text-sm text-red-300">
                  Jam sesi belum bisa dimuat.{' '}
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => void availability.refetch()}
                  >
                    Coba lagi
                  </button>
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 lg:grid-cols-2 [@media(min-height:900px)]:gap-3">
                  {slots.map(({ slot, available }) => {
                    const { start, end } = slotParts(slot);
                    const active = form.timeSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        aria-pressed={active}
                        disabled={!available}
                        onClick={() => onChange({ timeSlot: slot })}
                        className={`relative flex h-[clamp(3rem,6.5vh,4rem)] flex-col items-start justify-center rounded-xl border px-3.5 text-left transition-all ${
                          active
                            ? 'border-accent bg-accent text-accent-fg'
                            : available
                              ? 'border-white/10 bg-white/[0.03] text-fg hover:border-white/30'
                              : 'cursor-not-allowed border-white/5 bg-white/[0.02] text-muted-dim line-through'
                        }`}
                      >
                        <span className="text-[17px] font-semibold leading-none tabular-nums tracking-tight">
                          {start}
                        </span>
                        <span
                          className={`mt-1.5 whitespace-nowrap text-[11px] leading-none tabular-nums ${
                            active ? 'text-accent-fg/70' : 'text-muted'
                          }`}
                        >
                          s/d {end}
                        </span>
                        {!available && (
                          <span className="absolute right-2.5 top-2.5 text-[10px] font-bold uppercase tracking-wider no-underline">
                            Penuh
                          </span>
                        )}
                        {active && (
                          <Check className="absolute right-2.5 top-2.5 size-4" aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {availability.data && slots.every((item) => !item.available) && (
                <p className="mt-3 text-xs text-amber-200">
                  Semua jam di tanggal ini sudah terisi. Coba tanggal lain.
                </p>
              )}
              {errors.timeSlot && <p className="mt-2 text-xs text-red-300">{errors.timeSlot}</p>}
            </fieldset>
          </div>
        </StepCard>
        {addOns.length > 0 && (
          <StepCard index={3} title="Tambahan (opsional)" span="none" className="lg:col-span-12">
            <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              {addOns.map((addOn) => {
                const quantity = form.addOns[addOn.id] ?? 0;
                return (
                  <li
                    key={addOn.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                      quantity > 0 ? 'border-accent/60 bg-accent/[0.07]' : 'border-white/10'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug">{addOn.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {addOnPrice(addOn, formatRupiah)}
                        {addOn.extraMinutes > 0 && ` · +${addOn.extraMinutes} menit sesi`}
                      </p>
                    </div>
                    <Stepper
                      value={quantity}
                      max={addOn.maxQuantity}
                      label={addOn.name}
                      onChange={(next) => setQuantity(addOn.id, next)}
                    />
                  </li>
                );
              })}
            </ul>
          </StepCard>
        )}
      </StepGrid>

      <StepFooter
        hint={
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1" aria-live="polite">
            <CalendarDays className="size-4 shrink-0 text-accent" />
            {scheduled ? (
              <span className="flex flex-wrap items-center gap-x-2 text-fg">
                <strong>{formatDay(form.sessionDate)}</strong>
                <span className="flex items-center gap-1 text-xs tabular-nums text-muted">
                  <Clock className="size-3" />
                  {form.timeSlot} WIB
                  {summary.extraMinutes > 0 && ` (+${summary.extraMinutes} menit)`}
                </span>
              </span>
            ) : (
              'Pilih tanggal dan jam sesi'
            )}
            {summary.addOnsTotal > 0 && (
              <span className="text-xs text-muted">
                · Total <strong className="text-fg">{formatRupiah(summary.total)}</strong>
              </span>
            )}
          </p>
        }
      >
        <BookingButton type="submit" className="sm:w-72">
          Lanjut ke Preview Pesanan →
        </BookingButton>
      </StepFooter>
    </form>
  );
}
