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
    <div role="tablist" aria-label="Filter foto" className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={active === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
            active === tab.value
              ? 'border-amber-500 bg-amber-500 text-zinc-950'
              : 'border-zinc-300 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300',
          )}
        >
          {tab.label}
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
              active === tab.value
                ? 'bg-zinc-950/15'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
            )}
          >
            {counts[tab.value]}
          </span>
        </button>
      ))}
    </div>
  );
}
