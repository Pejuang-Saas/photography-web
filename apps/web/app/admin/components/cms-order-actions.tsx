'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CmsOrderActionsProps = {
  isFirst?: boolean;
  isLast?: boolean;
  isPending?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

export function CmsOrderActions({
  isFirst = false,
  isLast = false,
  isPending = false,
  onMoveUp,
  onMoveDown,
}: CmsOrderActionsProps) {
  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Naikkan urutan"
        title="Naikkan urutan"
        disabled={isFirst || isPending}
        onClick={onMoveUp}
        className="size-7 rounded-md border border-zinc-200 bg-white text-zinc-500 shadow-none hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <ChevronUp className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Turunkan urutan"
        title="Turunkan urutan"
        disabled={isLast || isPending}
        onClick={onMoveDown}
        className="size-7 rounded-md border border-zinc-200 bg-white text-zinc-500 shadow-none hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <ChevronDown className="size-3.5" />
      </Button>
    </div>
  );
}
