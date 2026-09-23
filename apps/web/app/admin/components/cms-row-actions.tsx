'use client';

import { Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CmsDeleteDialog } from './cms-delete-dialog';

type CmsRowActionsProps = {
  title: string;
  entityLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  isDeletePending?: boolean;
  isPublished?: boolean;
  publishLabel?: string;
  onTogglePublish?: () => void;
  isPublishPending?: boolean;
};

export function CmsRowActions({ title, entityLabel, onEdit, onDelete, isDeletePending = false, isPublished, publishLabel = 'Publish', onTogglePublish, isPublishPending = false }: CmsRowActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Aksi ${title}`} className="size-7 rounded-md border border-zinc-200 bg-white text-zinc-500 shadow-none hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"><MoreHorizontal className="size-4" /></Button>} />
      <DropdownMenuContent align="end" className="w-44 rounded-lg p-1">
        {onTogglePublish && <DropdownMenuItem disabled={isPublishPending} onSelect={onTogglePublish}><>{isPublished ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}{isPublished ? `Un${publishLabel.toLowerCase()}` : publishLabel}</></DropdownMenuItem>}
        <DropdownMenuItem onSelect={onEdit}><Pencil className="size-3.5" />Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-rose-600 focus:bg-rose-50 focus:text-rose-700 dark:focus:bg-rose-950/40" onSelect={() => setDeleteOpen(true)}><Trash2 className="size-3.5" />Hapus</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <CmsDeleteDialog title={title} entityLabel={entityLabel} onConfirm={onDelete} isPending={isDeletePending} open={deleteOpen} onOpenChange={setDeleteOpen} hideTrigger />
  </>;
}
