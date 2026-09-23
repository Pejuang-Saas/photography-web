import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CmsPageHeaderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  createHref?: string;
  createLabel?: string;
  backHref?: string;
  createAction?: ReactNode;
};

export function CmsPageHeader({
  title,
  description,
  createHref,
  createLabel,
  backHref,
  createAction,
}: CmsPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {backHref && (
          <Link href={backHref}>
            <Button variant="outline" size="icon" className="mt-0.5 size-9">
              <ArrowLeft className="size-4" />
              <span className="sr-only">Kembali</span>
            </Button>
          </Link>
        )}
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
      </div>
      {createAction ?? (createHref && createLabel && (
        <Link href={createHref}>
          <Button className="h-9 bg-amber-500 text-xs font-bold text-zinc-950 hover:bg-amber-600">
            <Plus className="mr-1.5 size-3.5" />
            {createLabel}
          </Button>
        </Link>
      ))}
    </div>
  );
}
