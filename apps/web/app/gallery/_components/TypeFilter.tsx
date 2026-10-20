import { Film, Image as ImageIcon, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaType } from '@/types/gallery';

/**
 * Photos, videos or both. Nothing to choose between when the gallery holds only one kind, so it
 * is not drawn then.
 */
export default function TypeFilter({
  value,
  onChange,
  totalPhotos,
  totalVideos,
}: {
  value: MediaType;
  onChange: (type: MediaType) => void;
  /** Photos and videos together, as the gallery counts them. */
  totalPhotos: number;
  totalVideos: number;
}) {
  const photos = Math.max(0, totalPhotos - totalVideos);
  if (photos === 0 || totalVideos === 0) return null;

  const options: { value: MediaType; label: string; count: number; icon: typeof LayoutGrid }[] = [
    { value: 'all', label: 'Semua', count: totalPhotos, icon: LayoutGrid },
    { value: 'photo', label: 'Foto', count: photos, icon: ImageIcon },
    { value: 'video', label: 'Video', count: totalVideos, icon: Film },
  ];

  return (
    <div
      role="tablist"
      aria-label="Filter tipe file"
      className="inline-flex h-11 max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-zinc-300/80 bg-zinc-200/70 p-1 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex h-full shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-all',
            value === option.value
              ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
              : 'text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
          )}
        >
          <option.icon className="size-3.5" />
          {option.label}
          <span className="rounded-md bg-zinc-300/60 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {option.count}
          </span>
        </button>
      ))}
    </div>
  );
}
