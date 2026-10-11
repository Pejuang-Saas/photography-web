import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QueryLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70"
        />
      ))}
    </div>
  );
}

export function QueryError({
  title = 'Data tidak dapat dimuat',
  message,
  retry,
}: {
  title?: string;
  message: string;
  retry: () => void;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/[0.04] px-6 text-center">
      <AlertCircle className="size-8 text-rose-500" />
      <h2 className="mt-3 font-bold text-zinc-900 dark:text-white">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-zinc-500">{message}</p>
      <Button onClick={retry} variant="outline" className="mt-4">
        Coba lagi
      </Button>
    </div>
  );
}
