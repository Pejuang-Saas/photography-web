'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { FolderKanban, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cmsApi, type GalleryCategory } from '@/lib/cms-api';
import { CmsPageHeader } from '../../components/cms-page-header';
import { CmsSubmittingLabel } from '../../components/cms-state';

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi.').max(80, 'Nama kategori maksimal 80 karakter.'),
  slug: z.string().trim().max(100, 'Slug maksimal 100 karakter.').refine((value) => !value || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.'),
  description: z.string().max(500, 'Deskripsi maksimal 500 karakter.'),
  isActive: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-rose-600">{message}</p> : null;
}

export function CategoryForm({ category }: { category?: GalleryCategory }) {
  const router = useRouter();
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
      isActive: category?.isActive ?? true,
    },
  });

  const save = useMutation({
    mutationFn: (values: CategoryFormValues) => {
      const payload = { ...values, slug: values.slug || undefined, description: values.description || undefined };
      return category ? cmsApi.updateCategory(category.id, payload) : cmsApi.createCategory(payload);
    },
    onSuccess: () => {
      toast.success(category ? 'Kategori diperbarui.' : 'Kategori berhasil ditambahkan.');
      router.push('/admin/cms/categories');
      router.refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Kategori gagal disimpan.'),
  });

  return <div className="space-y-6"><CmsPageHeader title={category ? 'Edit Kategori Gallery' : 'Tambah Kategori Gallery'} description={category ? 'Perbarui nama dan pengaturan kategori.' : 'Buat kategori untuk mengelompokkan foto gallery.'} icon={FolderKanban} backHref="/admin/cms/categories" />
    <form onSubmit={form.handleSubmit((values) => save.mutate(values))} className="max-w-3xl space-y-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">Nama kategori<Input {...form.register('name')} className="mt-2" placeholder="Contoh: Wedding" autoFocus /><FieldError message={form.formState.errors.name?.message} /></label><label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">Slug <span className="font-normal text-zinc-400">(opsional)</span><Input {...form.register('slug')} className="mt-2" placeholder="wedding" /><p className="mt-1 text-xs font-normal text-zinc-500">Kosongkan untuk dibuat otomatis dari nama.</p><FieldError message={form.formState.errors.slug?.message} /></label></div>
      <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">Deskripsi <span className="font-normal text-zinc-400">(opsional)</span><Textarea {...form.register('description')} className="mt-2 min-h-24" placeholder="Deskripsi singkat kategori." /><FieldError message={form.formState.errors.description?.message} /></label>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><input type="checkbox" {...form.register('isActive')} className="size-4 accent-amber-500" />Kategori aktif di landing page</label>
      <div className="flex justify-end border-t border-zinc-100 pt-5 dark:border-zinc-800"><Button type="submit" disabled={save.isPending} className="bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600">{save.isPending ? <CmsSubmittingLabel>Menyimpan</CmsSubmittingLabel> : <><Save className="mr-1.5 size-4" />Simpan kategori</>}</Button></div>
    </form></div>;
}
