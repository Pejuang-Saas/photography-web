'use client';

import { CalendarDays, Check, Clock } from 'lucide-react';
import { slotParts, TIME_SLOTS, type CustomerErrors, type CustomerForm } from '@/lib/booking-form';
import { formatDay } from '@/lib/format';
import { sanitizePhoneInput } from '@/lib/phone';
import DatePicker from './date-picker';
import { BookingButton } from './booking-button';
import { Field, labelClass, StepCard, StepFooter, StepGrid } from './step-layout';
import { fieldCompactClass, textareaCompactClass } from './ui';

export default function StepCustomerSchedule({
  form,
  errors,
  notice,
  onChange,
  onNext,
}: {
  form: CustomerForm;
  errors: CustomerErrors;
  notice?: string | null;
  onChange: (patch: Partial<CustomerForm>) => void;
  onNext: () => void;
}) {
  const scheduled = Boolean(form.sessionDate && form.timeSlot);

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

        <StepCard index={2} title="Jadwal Sesi" span="right">
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
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 lg:grid-cols-2 [@media(min-height:900px)]:gap-3">
                {TIME_SLOTS.map((slot) => {
                  const { start, end } = slotParts(slot);
                  const active = form.timeSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChange({ timeSlot: slot })}
                      className={`relative flex h-[clamp(3rem,6.5vh,4rem)] flex-col items-start justify-center rounded-xl border px-3.5 text-left transition-all ${
                        active
                          ? 'border-accent bg-accent text-accent-fg'
                          : 'border-white/10 bg-white/[0.03] text-fg hover:border-white/30'
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
                      {active && (
                        <Check className="absolute right-2.5 top-2.5 size-4" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
              {errors.timeSlot && <p className="mt-2 text-xs text-red-300">{errors.timeSlot}</p>}
            </fieldset>
          </div>
        </StepCard>
      </StepGrid>

      <StepFooter
        hint={
          <p className="flex items-center gap-2" aria-live="polite">
            <CalendarDays className="size-4 shrink-0 text-accent" />
            {scheduled ? (
              <span className="flex flex-wrap items-center gap-x-2 text-fg">
                <strong>{formatDay(form.sessionDate)}</strong>
                <span className="flex items-center gap-1 text-xs tabular-nums text-muted">
                  <Clock className="size-3" />
                  {form.timeSlot} WIB
                </span>
              </span>
            ) : (
              'Pilih tanggal dan jam sesi'
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
