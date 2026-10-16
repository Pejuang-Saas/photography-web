'use client';

import { id as idLocale } from 'react-day-picker/locale';
import { Calendar } from '@/components/ui/calendar';
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

/** Month grid sized to the modal: square-cornered day cells, a clear accent selection, no past days. */
export default function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (day: string) => void;
}) {
  return (
    <Calendar
      mode="single"
      locale={idLocale}
      buttonVariant="outline"
      selected={value ? toDate(value) : undefined}
      onSelect={(date) => date && onChange(toDay(date))}
      disabled={{ before: toDate(todayWib()) }}
      defaultMonth={value ? toDate(value) : undefined}
      className="w-full bg-transparent p-0 [--cell-radius:0.625rem] [--cell-size:clamp(2.25rem,5vh,3rem)]"
      classNames={{
        root: 'w-full',
        months: 'relative flex w-full flex-col',
        month: 'flex w-full flex-col gap-3',
        nav: 'absolute inset-x-0 top-0 flex w-full items-center justify-between',
        button_previous:
          'inline-flex size-[clamp(2rem,4vh,2.5rem)] items-center justify-center rounded-xl border border-white/10 text-fg transition-colors hover:border-white/30 hover:bg-white/5 aria-disabled:opacity-30',
        button_next:
          'inline-flex size-[clamp(2rem,4vh,2.5rem)] items-center justify-center rounded-xl border border-white/10 text-fg transition-colors hover:border-white/30 hover:bg-white/5 aria-disabled:opacity-30',
        month_caption: 'flex h-[clamp(2rem,4vh,2.5rem)] w-full items-center justify-center',
        caption_label: 'select-none text-sm font-semibold text-fg',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'flex-1 select-none pb-1.5 pt-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-dim',
        week: 'mt-0.5 flex w-full',
        day: 'relative aspect-square w-full p-px text-center',
        today: 'text-accent',
        outside: 'opacity-25',
        disabled: 'opacity-25',
        hidden: 'invisible',
      }}
    />
  );
}
