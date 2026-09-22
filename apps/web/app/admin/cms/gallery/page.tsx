'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, Pencil, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cmsApi } from '@/lib/cms-api';
import { CmsDeleteDialog } from '../../components/cms-delete-dialog';
import { CmsPageHeader } from '../../components/cms-page-header';
import { CmsEmptyState, CmsErrorState, CmsLoadingState } from '../../components/cms-state';

export default function GalleryPage() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const gallery = useQuery({ queryKey: ['cms', 'gallery'], queryFn: cmsApi.listGallery });
  const remove = useMutation({ mutationFn: cmsApi.deleteGallery, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cms', 'gallery'] }); toast.success('Foto gallery dihapus.'); }, onError: (error) => toast.error(error instanceof Error ? error.message : 'Foto gagal dihapus.') });
  const items = useMemo(() => (gallery.data ?? []).filter((item) => `${item.title} ${item.category?.name ?? ''} ${item.location ?? ''}`.toLowerCase().includes(search.toLowerCase())), [gallery.data, search]);
  return <div className="space-y-6"><CmsPageHeader title="Gallery Landing Page" description="Kelola foto yang tampil di portfolio publik Kayastory." icon={ImageIcon} createHref="/admin/cms/gallery/new" createLabel="Tambah Foto" /><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari judul, kategori, atau lokasi..." className="pl-9" /></div>{gallery.isLoading ? <CmsLoadingState /> : gallery.isError ? <CmsErrorState message={gallery.error instanceof Error ? gallery.error.message : 'Terjadi kesalahan.'} retry={() => gallery.refetch()} /> : items.length === 0 ? <CmsEmptyState title={search ? 'Foto tidak ditemukan' : 'Gallery masih kosong'} description={search ? 'Ubah kata kunci pencarian atau tambahkan foto baru.' : 'Mulai portfolio landing page dengan mengunggah foto pertama.'} action={<Link href="/admin/cms/gallery/new"><Button className="bg-amber-500 text-zinc-950 hover:bg-amber-600">Tambah Foto</Button></Link>} /> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={item.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"><div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-800"><Image src={item.mediaAsset.url} alt={item.altText} fill unoptimized className="object-cover" /><div className="absolute left-3 top-3 flex gap-2"><Badge className={item.isPublished ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'border-zinc-500/20 bg-zinc-900/60 text-white'}>{item.isPublished ? 'Published' : 'Draft'}</Badge>{item.isFeatured && <Badge className="border-amber-500/20 bg-amber-500/90 text-zinc-950">Unggulan</Badge>}</div></div><div className="space-y-3 p-4"><div><h2 className="font-bold text-zinc-900 dark:text-white">{item.title}</h2><p className="mt-1 text-xs text-zinc-500">{item.category?.name ?? 'Tanpa kategori'}{item.location ? ` · ${item.location}` : ''}</p></div><div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800"><span className="text-xs text-zinc-500">Urutan: {item.sortOrder}</span><div className="flex items-center"><Link href={`/admin/cms/gallery/${item.id}/edit`}><Button variant="ghost" size="sm" className="h-8 text-amber-600 hover:bg-amber-500/10"><Pencil className="mr-1 size-3.5" />Edit</Button></Link><CmsDeleteDialog title={item.title} onConfirm={() => remove.mutate(item.id)} isPending={remove.isPending} /></div></div></div></article>)}</div>}</div>;
}
