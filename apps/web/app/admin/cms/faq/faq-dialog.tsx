'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HelpCircle, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cmsApi, type FaqItem } from '@/lib/cms-api';
import { CmsSubmittingLabel } from '../../components/cms-state';
const schema = z.object({ question: z.string().trim().min(1, 'Pertanyaan wajib diisi.').max(250), answer: z.string().trim().min(1, 'Jawaban wajib diisi.'), isPublished: z.boolean() });
type Values = z.infer<typeof schema>;
export function FaqDialog({ open, onOpenChange, item }: { open: boolean; onOpenChange: (open: boolean) => void; item?: FaqItem }) {
  const queryClient = useQueryClient();
  const form = useForm<Values>({ resolver: zodResolver(schema), values: { question: item?.question ?? '', answer: item?.answer ?? '', isPublished: item?.isPublished ?? false } });
  const save = useMutation({ mutationFn: (values: Values) => item ? cmsApi.updateFaq(item.id, values) : cmsApi.createFaq(values), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cms', 'faq'] }); toast.success(item ? 'FAQ diperbarui.' : 'FAQ berhasil ditambahkan.'); onOpenChange(false); }, onError: (error) => toast.error(error instanceof Error ? error.message : 'FAQ gagal disimpan.') });
  return <Dialog open={open} onOpenChange={(value) => { if (!save.isPending) onOpenChange(value); }}><DialogContent className="max-w-[calc(100%-2rem)] overflow-hidden rounded-2xl p-0 sm:max-w-xl"><div className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800"><DialogHeader><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"><HelpCircle className="size-4" /></div><div><DialogTitle className="text-base font-bold">{item ? 'Edit FAQ' : 'Tambah FAQ'}</DialogTitle><DialogDescription className="mt-1">Kelola pertanyaan dan jawaban untuk landing page.</DialogDescription></div></div></DialogHeader></div><form onSubmit={form.handleSubmit((values) => save.mutate(values))} className="space-y-5 px-6 py-5"><label className="block text-sm font-semibold">Pertanyaan<Input {...form.register('question')} className="mt-2" placeholder="Contoh: Di mana lokasi sesi foto?" autoFocus /><FieldError message={form.formState.errors.question?.message} /></label><label className="block text-sm font-semibold">Jawaban<textarea {...form.register('answer')} rows={6} className="mt-2 w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" placeholder="Tulis jawaban yang jelas untuk calon customer." /><FieldError message={form.formState.errors.answer?.message} /></label><label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><input type="checkbox" {...form.register('isPublished')} className="size-4 accent-amber-500" />Tampilkan di landing page</label><div className="-mx-6 -mb-5 flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/70 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/60"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>Batal</Button><Button type="submit" disabled={save.isPending} className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">{save.isPending ? <CmsSubmittingLabel>Menyimpan</CmsSubmittingLabel> : <><Save className="mr-1.5 size-3.5" />Simpan</>}</Button></div></form></DialogContent></Dialog>;
}
function FieldError({ message }: { message?: string }) { return message ? <p className="mt-1 text-xs font-normal text-rose-600">{message}</p> : null; }
