'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CmsSubmittingLabel } from './cms-state';

export function CmsDeleteDialog({ title, onConfirm, isPending }: { title: string; onConfirm: () => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}><Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="h-8 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"><Trash2 className="mr-1 size-3.5" />Hapus</Button><DialogContent><DialogHeader><DialogTitle>Hapus foto gallery?</DialogTitle><DialogDescription><strong>{title}</strong> akan dihapus dari gallery. Tindakan ini tidak dapat dibatalkan.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Batal</Button><Button variant="destructive" onClick={onConfirm} disabled={isPending}>{isPending ? <CmsSubmittingLabel>Menghapus</CmsSubmittingLabel> : 'Hapus foto'}</Button></DialogFooter></DialogContent></Dialog>;
}
