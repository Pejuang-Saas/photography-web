import { cn } from '@/lib/utils';
import type { GalleryFilter } from './gallery-state';

const TABS: { value: GalleryFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'selected', label: 'Dipilih' },
  { value: 'unselected', label: 'Belum dipilih' },
];

export default function FilterTabs({
  active,
  counts,
  onChange,
}: {
  active: GalleryFilter;
  counts: Record<GalleryFilter, number>;
  onChange: (filter: GalleryFilter) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter foto"
      className="inline-flex h-11 max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-zinc-300/80 bg-zinc-200/70 p-1 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={active === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'inline-flex h-full shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-all',
            active === tab.value
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
          )}
        >
          {tab.label}
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
              active === tab.value
                ? 'bg-zinc-950/15'
                : 'bg-zinc-300/60 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
            )}
          >
            {counts[tab.value]}
          </span>
        </button>
      ))}
    </div>
  );
}
