'use client';

import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ImagePlus, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cmsApi, type GalleryItem } from '@/lib/cms-api';
import { CmsPageHeader } from '../../components/cms-page-header';
import { CmsSubmittingLabel } from '../../components/cms-state';

const gallerySchema = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi.').max(160),
  altText: z.string().trim().min(1, 'Alt text wajib diisi.').max(250),
  categoryId: z.string().optional(),
  caption: z.string().max(1000).optional(),
  location: z.string().max(160).optional(),
  isFeatured: z.boolean(),
  isPublished: z.boolean(),
});

type GalleryFormValues = z.infer<typeof gallerySchema>;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-rose-600">{message}</p> : null;
}

export function GalleryForm({ item }: { item?: GalleryItem }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(item?.mediaAsset.url ?? '');
  const [fileError, setFileError] = useState<string>();
  const { data: categories = [] } = useQuery({ queryKey: ['cms', 'categories'], queryFn: cmsApi.listCategories });
  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(gallerySchema),
    defaultValues: {
      title: item?.title ?? '', altText: item?.altText ?? '', categoryId: item?.categoryId ?? '',
      caption: item?.caption ?? '', location: item?.location ?? '',
      isFeatured: item?.isFeatured ?? false, isPublished: item?.isPublished ?? false,
    },
  });

  const save = useMutation({
    mutationFn: async (values: GalleryFormValues) => {
      const payload = { ...values, categoryId: values.categoryId || undefined, caption: values.caption || undefined, location: values.location || undefined };
      if (item) return file ? cmsApi.updateGalleryWithImage(item.id, payload, file) : cmsApi.updateGallery(item.id, payload);
      if (!file) throw new Error('Pilih gambar untuk foto gallery.');
      return cmsApi.createGalleryWithImage(payload, file);
    },
    onSuccess: () => { toast.success(item ? 'Foto gallery diperbarui.' : 'Foto gallery berhasil ditambahkan.'); router.push('/admin/cms/gallery'); router.refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Foto gallery gagal disimpan.'),
  });

  const selectFile = (selected?: File) => {
    setFileError(undefined);
    if (!selected) return;
    if (!selected.type.startsWith('image/')) { setFileError('Pilih file gambar.'); return; }
    if (selected.size > 10 * 1024 * 1024) { setFileError('Ukuran gambar maksimal 10 MB.'); return; }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const submit = (values: GalleryFormValues) => {
    if (!item && !file) { setFileError('Pilih gambar untuk foto gallery.'); return; }
    save.mutate(values);
  };

  return <div className="space-y-6"><CmsPageHeader title={item ? 'Edit Foto Gallery' : 'Tambah Foto Gallery'} description={item ? 'Perbarui konten, metadata, dan visibilitas foto.' : 'Unggah foto dan lengkapi informasi agar tampil baik di landing page.'} icon={ImagePlus} backHref="/admin/cms/gallery" />
    <form onSubmit={form.handleSubmit(submit)} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">Judul<Input {...form.register('title')} className="mt-2" placeholder="Contoh: Wisuda Kebaya di Undip" /><FieldError message={form.formState.errors.title?.message} /></label><label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">Alt text<Input {...form.register('altText')} className="mt-2" placeholder="Deskripsi visual foto" /><FieldError message={form.formState.errors.altText?.message} /></label></div>
        <div><label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">Kategori <span className="font-normal text-zinc-400">(opsional)</span><select {...form.register('categoryId')} className="mt-2 h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"><option value="">Tanpa kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div>
        <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">Lokasi <span className="font-normal text-zinc-400">(opsional)</span><Input {...form.register('location')} className="mt-2" placeholder="Contoh: Universitas Diponegoro" /><FieldError message={form.formState.errors.location?.message} /></label>
        <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">Caption <span className="font-normal text-zinc-400">(opsional)</span><textarea {...form.register('caption')} rows={4} className="mt-2 w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-950" placeholder="Cerita singkat di balik foto ini." /><FieldError message={form.formState.errors.caption?.message} /></label>
        <div className="flex flex-wrap gap-5 border-t border-zinc-100 pt-4 dark:border-zinc-800"><label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><input type="checkbox" {...form.register('isFeatured')} className="size-4 accent-amber-500" />Tandai sebagai unggulan</label><label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><input type="checkbox" {...form.register('isPublished')} className="size-4 accent-amber-500" />Publikasikan ke landing page</label></div>
      </section>
      <aside className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60"><div><h2 className="font-bold text-zinc-900 dark:text-white">Gambar gallery</h2><p className="mt-1 text-xs text-zinc-500">JPG, PNG, WebP, atau format gambar lain. Maksimal 10 MB.</p></div>{preview ? <div className="relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"><Image src={preview} alt="Preview gambar gallery" fill unoptimized className="object-cover" /></div> : <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700"><ImagePlus className="size-8" /></div>}<label className="block"><span className="sr-only">Pilih gambar</span><Input type="file" accept="image/*" onChange={(event) => selectFile(event.target.files?.[0])} disabled={save.isPending} className="cursor-pointer" /></label>{item && <p className="text-xs text-zinc-500">Biarkan kosong untuk memakai gambar saat ini.</p>}<FieldError message={fileError} /><Button type="submit" disabled={save.isPending} className="w-full bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600">{save.isPending ? <CmsSubmittingLabel>Menyimpan</CmsSubmittingLabel> : <><Save className="mr-1.5 size-4" />Simpan foto</>}</Button></aside>
    </form></div>;
}
