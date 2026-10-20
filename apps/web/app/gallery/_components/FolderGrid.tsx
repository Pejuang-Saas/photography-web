'use client';

import { ChevronRight, Folder, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FolderSummary } from '@/types/gallery';

/** Where the visitor is, with every level above it a click away. */
export function FolderBreadcrumb({
  path,
  onOpen,
}: {
  path: string;
  onOpen: (path: string) => void;
}) {
  const names = path ? path.split('/') : [];
  return (
    <nav aria-label="Lokasi folder" className="flex flex-wrap items-center gap-1 text-sm">
      <button
        type="button"
        onClick={() => onOpen('')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium transition-colors hover:bg-zinc-200/70 dark:hover:bg-zinc-800',
          names.length === 0 && 'text-zinc-900 dark:text-white',
          names.length > 0 && 'text-zinc-500',
        )}
      >
        <Home className="size-3.5" />
        Semua folder
      </button>
      {names.map((name, index) => {
        const last = index === names.length - 1;
        return (
          <span key={names.slice(0, index + 1).join('/')} className="flex items-center gap-1">
            <ChevronRight className="size-3.5 text-zinc-400" />
            <button
              type="button"
              disabled={last}
              onClick={() => onOpen(names.slice(0, index + 1).join('/'))}
              className={cn(
                'rounded-md px-2 py-1 font-medium transition-colors',
                last
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-500 hover:bg-zinc-200/70 dark:hover:bg-zinc-800',
              )}
            >
              {name}
            </button>
          </span>
        );
      })}
    </nav>
  );
}

function FolderCard({
  folder,
  onOpen,
}: {
  folder: FolderSummary;
  onOpen: (folder: FolderSummary) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(folder)}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 text-left transition-colors hover:border-amber-500/60 hover:bg-amber-500/[0.04] dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-amber-500/50"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
        <Folder className="size-5 fill-amber-500 text-amber-500" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-white">
          {folder.name}
        </span>
        <span className="block text-xs text-zinc-500">
          {folder.count} foto
          {folder.selected > 0 && ` · ${folder.selected} dipilih`}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

/** The folders directly inside the open one, listed above the photos. */
export default function FolderGrid({
  folders,
  onOpen,
}: {
  folders: FolderSummary[];
  onOpen: (folder: FolderSummary) => void;
}) {
  if (folders.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
      {folders.map((folder) => (
        <FolderCard key={folder.path} folder={folder} onOpen={onOpen} />
      ))}
    </div>
  );
}
