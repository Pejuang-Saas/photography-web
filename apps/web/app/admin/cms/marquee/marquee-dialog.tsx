'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cmsApi, type MarqueeItem } from '@/lib/cms-api';
import { CmsSubmittingLabel } from '../../components/cms-state';
const schema = z.object({ text: z.string().trim().min(1, 'Teks marquee wajib diisi.').max(250, 'Maksimal 250 karakter.'), linkUrl: z.string().trim().refine((value) => !value || /^https?:\/\//i.test(value), 'URL harus diawali http:// atau https://.'), isActive: z.boolean() });
type Values = z.infer<typeof schema>;
export function MarqueeDialog({ open, onOpenChange, item }: { open: boolean; onOpenChange: (open: boolean) => void; item?: MarqueeItem }) {
  const queryClient = useQueryClient();
  const form = useForm<Values>({ resolver: zodResolver(schema), values: { text: item?.text ?? '', linkUrl: item?.linkUrl ?? '', isActive: item?.isActive ?? true } });
  const save = useMutation({ mutationFn: (values: Values) => { const payload = { ...values, linkUrl: values.linkUrl || undefined }; return item ? cmsApi.updateMarquee(item.id, payload) : cmsApi.createMarquee(payload); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cms', 'marquee'] }); toast.success(item ? 'Marquee diperbarui.' : 'Marquee berhasil ditambahkan.'); onOpenChange(false); }, onError: (error) => toast.error(error instanceof Error ? error.message : 'Marquee gagal disimpan.') });
  return <Dialog open={open} onOpenChange={(value) => { if (!save.isPending) onOpenChange(value); }}><DialogContent className="max-w-[calc(100%-2rem)] overflow-hidden rounded-2xl p-0 sm:max-w-lg"><div className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800"><DialogHeader><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"><Megaphone className="size-4" /></div><div><DialogTitle className="text-base font-bold">{item ? 'Edit marquee' : 'Tambah marquee'}</DialogTitle><DialogDescription className="mt-1">Kelola teks berjalan yang tampil di landing page.</DialogDescription></div></div></DialogHeader></div><form onSubmit={form.handleSubmit((values) => save.mutate(values))} className="space-y-5 px-6 py-5"><label className="block text-sm font-semibold">Teks marquee<Input {...form.register('text')} className="mt-2" placeholder="Contoh: Booking sesi wisuda sekarang" autoFocus /><FieldError message={form.formState.errors.text?.message} /></label><label className="block text-sm font-semibold">Link tujuan <span className="font-normal text-zinc-400">(opsional)</span><Input {...form.register('linkUrl')} className="mt-2" placeholder="https://kayastory.id/paket" /><FieldError message={form.formState.errors.linkUrl?.message} /></label><label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><input type="checkbox" {...form.register('isActive')} className="size-4 accent-amber-500" />Marquee aktif</label><div className="-mx-6 -mb-5 flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/70 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/60"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>Batal</Button><Button type="submit" disabled={save.isPending} className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">{save.isPending ? <CmsSubmittingLabel>Menyimpan</CmsSubmittingLabel> : <><Save className="mr-1.5 size-3.5" />Simpan</>}</Button></div></form></DialogContent></Dialog>;
}
function FieldError({ message }: { message?: string }) { return message ? <p className="mt-1 text-xs font-normal text-rose-600">{message}</p> : null; }
