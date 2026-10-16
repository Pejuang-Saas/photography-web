import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { sectionClass } from './ui';

/** Every step is built from these three pieces, so spacing and shapes never drift between steps. */
export function StepGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-12 [@media(min-height:900px)]:gap-6">{children}</div>
  );
}

export function StepCard({
  index,
  title,
  span = 'left',
  className,
  children,
}: {
  index: number;
  title: string;
  /** `left` is the narrow column, `right` the wide one (5/7 of the grid), `none` inside a StepColumn. */
  span?: 'left' | 'right' | 'none';
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        sectionClass,
        'flex flex-col [@media(min-height:900px)]:gap-1',
        span === 'left' && 'lg:col-span-5',
        span === 'right' && 'lg:col-span-7',
        className,
      )}
    >
      <h2 className="mb-4 flex items-center gap-2.5 text-sm font-bold [@media(min-height:900px)]:mb-6">
        <span className="flex size-6 items-center justify-center rounded-full bg-accent/15 text-[11px] text-accent">
          {index}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Two cards stacked in one grid column. */
export function StepColumn({
  span = 'right',
  children,
}: {
  span?: 'left' | 'right';
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 [@media(min-height:900px)]:gap-6',
        span === 'left' ? 'lg:col-span-5' : 'lg:col-span-7',
      )}
    >
      {children}
    </div>
  );
}

export function StepFooter({ hint, children }: { hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between [@media(min-height:900px)]:mt-6">
      <div className="min-w-0 text-sm text-muted">{hint}</div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>
    </div>
  );
}

/** Label above a control with a clear 8px gap (12px on tall screens), plus an optional error line. */
export const labelClass = 'block text-xs font-medium text-muted';

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={cn(labelClass, 'mb-2 [@media(min-height:900px)]:mb-3')}>{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-red-300">{error}</span>}
    </label>
  );
}
