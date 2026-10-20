import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { nearLimit } from './gallery-state';

export default function SelectionBar({
  selectedCount,
  max,
  submitted,
  onSubmit,
}: {
  selectedCount: number;
  max: number | null;
  submitted: boolean;
  onSubmit: () => void;
}) {
  const warn = nearLimit(selectedCount, max);
  const percent = max ? Math.min(100, (selectedCount / max) * 100) : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      {max !== null && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={selectedCount}
          aria-label="Jumlah foto dipilih"
          className="h-1.5 bg-zinc-200 dark:bg-zinc-800"
        >
          <div
            className={cn('h-full transition-all', warn ? 'bg-orange-500' : 'bg-amber-500')}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6">
        <p
          className={cn(
            'text-[15px] font-bold sm:text-lg',
            warn && 'text-orange-600 dark:text-orange-400',
          )}
        >
          {selectedCount} Foto Dipilih
          {max !== null && (
            <span className="text-sm font-normal text-zinc-500"> dari maks. {max}</span>
          )}
        </p>
        {submitted ? (
          <span className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
            Pilihan terkirim
          </span>
        ) : (
          <Button
            disabled={selectedCount === 0}
            onClick={onSubmit}
            className="h-10 bg-amber-500 px-5 text-sm font-bold text-zinc-950 hover:bg-amber-600 sm:px-6"
          >
            Tinjau Pilihan
          </Button>
        )}
      </div>
    </div>
  );
}
