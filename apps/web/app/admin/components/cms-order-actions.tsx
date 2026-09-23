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

export function CmsOrderActions({ isFirst = false, isLast = false, isPending = false, onMoveUp, onMoveDown }: CmsOrderActionsProps) {
  return <div className="inline-flex items-center rounded-md border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
    <Button type="button" variant="ghost" size="icon-sm" aria-label="Naikkan urutan" title="Naikkan urutan" disabled={isFirst || isPending} onClick={onMoveUp} className="size-7 rounded-r-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"><ChevronUp className="size-3.5" /></Button>
    <span className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
    <Button type="button" variant="ghost" size="icon-sm" aria-label="Turunkan urutan" title="Turunkan urutan" disabled={isLast || isPending} onClick={onMoveDown} className="size-7 rounded-l-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"><ChevronDown className="size-3.5" /></Button>
  </div>;
}
