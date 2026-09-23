'use client';

import { useState, type ReactElement } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CmsSubmittingLabel } from './cms-state';

export function CmsDeleteDialog({ title, onConfirm, isPending, entityLabel = 'foto gallery', trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange, hideTrigger = false }: { title: string; onConfirm: () => void; isPending: boolean; entityLabel?: string; trigger?: ReactElement; open?: boolean; onOpenChange?: (open: boolean) => void; hideTrigger?: boolean }) {
  const [open, setOpen] = useState(false);
  const isOpen = controlledOpen ?? open;
  const changeOpen = (value: boolean) => { if (!isPending) (controlledOnOpenChange ?? setOpen)(value); };
  const confirm = () => {
    onConfirm();
    changeOpen(false);
  };

  return <Dialog open={isOpen} onOpenChange={changeOpen}>
    {!hideTrigger && (trigger ? <DialogTrigger render={trigger} /> : <Button variant="ghost" size="sm" onClick={() => changeOpen(true)} className="h-7 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-500 shadow-none hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-rose-950/40"><Trash2 className="mr-1 size-3.5" />Hapus</Button>)}
    <DialogContent className="max-w-[calc(100%-2rem)] overflow-hidden rounded-2xl p-0 sm:max-w-md">
      <DialogHeader className="gap-3 px-6 pb-5 pt-6">
        <div className="min-w-0 pr-5"><DialogTitle className="text-base font-bold text-zinc-900 dark:text-white">Hapus {entityLabel}?</DialogTitle><DialogDescription className="mt-1.5 text-sm leading-relaxed text-zinc-500">Foto <span className="font-semibold text-zinc-700 dark:text-zinc-300">“{title}”</span> akan dihapus permanen dari konten website.</DialogDescription></div>
      </DialogHeader>
      <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/70 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
        <Button variant="outline" onClick={() => changeOpen(false)} disabled={isPending} className="h-9 rounded-lg px-3 text-xs">Batal</Button>
        <Button variant="destructive" onClick={confirm} disabled={isPending} className="h-9 rounded-lg px-3 text-xs font-semibold">{isPending ? <CmsSubmittingLabel>Menghapus</CmsSubmittingLabel> : <><Trash2 className="mr-1.5 size-3.5" />Hapus permanen</>}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
