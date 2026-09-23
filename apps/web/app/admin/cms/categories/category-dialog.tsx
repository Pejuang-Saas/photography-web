'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderKanban, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cmsApi, type GalleryCategory } from '@/lib/cms-api';
import { CmsSubmittingLabel } from '../../components/cms-state';

const schema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi.').max(80, 'Maksimal 80 karakter.'),
  slug: z.string().trim().max(100, 'Maksimal 100 karakter.').refine((value) => !value || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), 'Gunakan huruf kecil, angka, dan tanda hubung.'),
  description: z.string().max(500, 'Maksimal 500 karakter.'),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function CategoryDialog({ open, onOpenChange, category }: { open: boolean; onOpenChange: (open: boolean) => void; category?: GalleryCategory }) {
  const queryClient = useQueryClient();
  const form = useForm<Values>({ resolver: zodResolver(schema), values: { name: category?.name ?? '', slug: category?.slug ?? '', description: category?.description ?? '', isActive: category?.isActive ?? true } });
  const save = useMutation({ mutationFn: (values: Values) => { const payload = { ...values, slug: values.slug || undefined, description: values.description || undefined }; return category ? cmsApi.updateCategory(category.id, payload) : cmsApi.createCategory(payload); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cms', 'categories'] }); toast.success(category ? 'Kategori diperbarui.' : 'Kategori berhasil ditambahkan.'); onOpenChange(false); }, onError: (error) => toast.error(error instanceof Error ? error.message : 'Kategori gagal disimpan.') });

  return <Dialog open={open} onOpenChange={(value) => { if (!save.isPending) onOpenChange(value); }}><DialogContent className="max-w-lg overflow-hidden rounded-2xl p-0"><div className="border-b border-zinc-200/80 bg-zinc-50/80 px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900/60"><DialogHeader className="gap-3"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400"><FolderKanban className="size-5" /></div><div><DialogTitle className="text-lg font-extrabold">{category ? 'Edit kategori' : 'Tambah kategori'}</DialogTitle><DialogDescription className="mt-1">{category ? 'Perbarui informasi kategori gallery.' : 'Buat kategori untuk mengelompokkan foto gallery.'}</DialogDescription></div></div></DialogHeader></div><form onSubmit={form.handleSubmit((values) => save.mutate(values))} className="space-y-5 px-6 py-5"><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">Nama kategori<span className="mt-1 block text-xs font-normal text-zinc-500">Nama yang tampil di admin.</span><Input {...form.register('name')} className="mt-2" placeholder="Contoh: Wedding" autoFocus aria-invalid={Boolean(form.formState.errors.name)} /><FieldError message={form.formState.errors.name?.message} /></label><label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">Slug<span className="mt-1 block text-xs font-normal text-zinc-500">Kosongkan untuk dibuat otomatis.</span><Input {...form.register('slug')} className="mt-2" placeholder="wedding" aria-invalid={Boolean(form.formState.errors.slug)} /><FieldError message={form.formState.errors.slug?.message} /></label></div><label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">Deskripsi<span className="mt-1 block text-xs font-normal text-zinc-500">Opsional, maksimal 500 karakter.</span><Textarea {...form.register('description')} className="mt-2 min-h-24 resize-y" placeholder="Deskripsi singkat kategori." aria-invalid={Boolean(form.formState.errors.description)} /><FieldError message={form.formState.errors.description?.message} /></label><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-900/50"><input type="checkbox" {...form.register('isActive')} className="size-4 accent-amber-500" /><span><span className="block">Kategori aktif</span><span className="block text-xs font-normal text-zinc-500">Kategori tersedia untuk konten landing page.</span></span></label><DialogFooter className="-mx-6 -mb-5 border-t border-zinc-200/80 bg-zinc-50/60 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/40"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>Batal</Button><Button type="submit" disabled={save.isPending} className="bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600">{save.isPending ? <CmsSubmittingLabel>Menyimpan</CmsSubmittingLabel> : <><Save className="mr-1.5 size-4" />Simpan kategori</>}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function FieldError({ message }: { message?: string }) { return message ? <p className="mt-1 text-xs font-normal text-rose-600">{message}</p> : null; }
