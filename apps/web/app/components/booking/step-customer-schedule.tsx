'use client';

import { id as idLocale } from 'react-day-picker/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TIME_SLOTS, type CustomerErrors, type CustomerForm } from '@/lib/booking-form';
import { todayWib } from '@/lib/format';

function toDate(day: string) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
}

function toDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-red-300">{message}</p> : null;
}

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
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
      className="space-y-4"
    >
      {notice && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          {notice}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="text-muted">Nama lengkap *</span>
          <Input
            maxLength={120}
            value={form.customerName}
            onChange={(event) => onChange({ customerName: event.target.value })}
            placeholder="Nama sesuai identitas"
            aria-invalid={Boolean(errors.customerName)}
          />
          <FieldError message={errors.customerName} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-muted">Nomor WhatsApp aktif *</span>
          <Input
            inputMode="tel"
            maxLength={20}
            value={form.customerPhone}
            onChange={(event) => onChange({ customerPhone: event.target.value })}
            placeholder="08xxxxxxxxxx"
            aria-invalid={Boolean(errors.customerPhone)}
          />
          <FieldError message={errors.customerPhone} />
        </label>
      </div>

      <label className="block space-y-1.5 text-sm">
        <span className="text-muted">Email (untuk konfirmasi invoice) *</span>
        <Input
          type="email"
          maxLength={180}
          value={form.customerEmail}
          onChange={(event) => onChange({ customerEmail: event.target.value })}
          placeholder="nama@email.com"
          aria-invalid={Boolean(errors.customerEmail)}
        />
        <FieldError message={errors.customerEmail} />
      </label>

      <div className="space-y-1.5 text-sm">
        <span className="text-muted">Tanggal sesi *</span>
        <div className="flex justify-center rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <Calendar
            mode="single"
            locale={idLocale}
            selected={form.sessionDate ? toDate(form.sessionDate) : undefined}
            onSelect={(date) => date && onChange({ sessionDate: toDay(date) })}
            disabled={{ before: toDate(todayWib()) }}
            defaultMonth={form.sessionDate ? toDate(form.sessionDate) : undefined}
          />
        </div>
        <FieldError message={errors.sessionDate} />
      </div>

      <fieldset className="space-y-1.5 text-sm">
        <legend className="text-muted">Jam sesi *</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              aria-pressed={form.timeSlot === slot}
              onClick={() => onChange({ timeSlot: slot })}
              className={`rounded-xl border px-3 py-2 font-mono text-xs transition-colors ${
                form.timeSlot === slot
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-white/10 text-fg hover:border-white/25'
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
        <FieldError message={errors.timeSlot} />
      </fieldset>

      <label className="block space-y-1.5 text-sm">
        <span className="text-muted">Catatan (opsional)</span>
        <Textarea
          maxLength={1000}
          value={form.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder="Contoh: lokasi kampus atau kebutuhan khusus"
        />
      </label>

      <Button type="submit" className="w-full">
        Lanjut ke Preview Pesanan
      </Button>
    </form>
  );
}
