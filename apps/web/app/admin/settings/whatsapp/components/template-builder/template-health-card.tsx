import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import type { TemplateHealth } from '@/lib/whatsapp-template-api';
import { cn } from '@/lib/utils';

const STYLE = {
  good: {
    icon: ShieldCheck,
    label: 'Sangat baik',
    box: 'border-emerald-500/30 bg-emerald-500/[0.06]',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  warning: {
    icon: ShieldAlert,
    label: 'Perhatian',
    box: 'border-amber-500/40 bg-amber-500/[0.07]',
    text: 'text-amber-700 dark:text-amber-400',
  },
  error: {
    icon: ShieldX,
    label: 'Perlu diperbaiki',
    box: 'border-rose-500/30 bg-rose-500/[0.06]',
    text: 'text-rose-700 dark:text-rose-400',
  },
} as const;

/** Whether the message is safe to send, and what to change when it is not. */
export default function TemplateHealthCard({
  health,
  pending,
}: {
  health: TemplateHealth | null;
  pending?: boolean;
}) {
  if (!health) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-3.5 text-xs text-zinc-500 dark:border-zinc-700">
        Penilaian kesehatan pesan muncul setelah Anda mengetik.
      </p>
    );
  }
  const style = STYLE[health.level];
  const Icon = style.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'rounded-xl border p-3.5 transition-opacity',
        style.box,
        pending && 'opacity-60',
      )}
    >
      <p className={cn('flex items-center gap-2 text-sm font-bold', style.text)}>
        <Icon className="size-4" />
        {style.label}
      </p>
      <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300">{health.summary}</p>
      {health.issues.length > 0 && (
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
          {health.issues.map((issue) => (
            <li key={issue.message}>{issue.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
