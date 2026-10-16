import type { ReactNode } from 'react';

export function FormField({
  label,
  hint,
  counter,
  children,
}: {
  label: string;
  hint?: string;
  counter?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
        {counter}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-zinc-500">{hint}</span>}
    </label>
  );
}

/** Character counter that turns amber once the recommended length is exceeded. */
export function CharCounter({
  value,
  recommended,
  max,
}: {
  value: string;
  recommended?: number;
  max: number;
}) {
  const over = recommended !== undefined && value.length > recommended;
  return (
    <span
      className={`font-mono text-[11px] ${over ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500'}`}
    >
      {value.length}/{recommended ?? max}
    </span>
  );
}
