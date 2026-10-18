/** Category colours, in the order they are offered. The keys are what the API stores. */
export const CRM_COLOR_KEYS = ['green', 'blue', 'amber', 'purple', 'rose', 'zinc'] as const;
export type CrmColor = (typeof CRM_COLOR_KEYS)[number];

export const CRM_COLORS: Record<CrmColor, { label: string; badge: string; dot: string }> = {
  green: {
    label: 'Hijau',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  blue: {
    label: 'Biru',
    badge: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
    dot: 'bg-sky-500',
  },
  amber: {
    label: 'Kuning',
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  purple: {
    label: 'Ungu',
    badge: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400',
    dot: 'bg-violet-500',
  },
  rose: {
    label: 'Merah',
    badge: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  zinc: {
    label: 'Abu-abu',
    badge: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
    dot: 'bg-zinc-500',
  },
};

/** An unknown key (for example from a newer API) falls back to grey instead of breaking the page. */
export const crmColor = (key: string) => CRM_COLORS[key as CrmColor] ?? CRM_COLORS.zinc;
