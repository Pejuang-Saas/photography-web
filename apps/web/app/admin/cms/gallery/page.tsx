'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Eye, EyeOff, ImageIcon, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cmsApi, type GalleryItem } from '@/lib/cms-api';
import { CmsDeleteDialog } from '../../components/cms-delete-dialog';
import { CmsPageHeader } from '../../components/cms-page-header';
import { CmsErrorState } from '../../components/cms-state';
import { CmsOrderActions } from '../../components/cms-order-actions';

const PAGE_SIZE = 12;

function GalleryCard({ item, index, total, onDelete, onReorder, onPublish, isDeleting, isReordering, isPublishing }: { item: GalleryItem; index: number; total: number; onDelete: () => void; onReorder: (direction: 'up' | 'down') => void; onPublish: () => void; isDeleting: boolean; isReordering: boolean; isPublishing: boolean }) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-white transition-colors hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="p-2 pb-0">
        <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
          <Image src={item.mediaAsset.url} alt={item.altText} fill unoptimized sizes="(min-width: 1280px) 240px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          {item.isFeatured && <span className="absolute right-2 top-2 rounded border border-white/60 bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200">Unggulan</span>}
        </div>
      </div>
      <div className="px-3 pb-3 pt-3">
        <p className="truncate text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{item.category?.name ?? 'Tanpa kategori'}</p>
        <h3 className="mt-1 truncate text-[13px] font-semibold leading-5 text-zinc-900 dark:text-zinc-100" title={item.title}>{item.title}</h3>
        <p className="mt-0.5 h-4 truncate text-[11px] text-zinc-500">{item.location || 'Lokasi tidak dicantumkan'}</p>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500"><span className={`size-1.5 rounded-full ${item.isPublished ? 'bg-emerald-500' : 'bg-zinc-400'}`} />{item.isPublished ? 'Terbit' : 'Draft'}</span>
          <div className="flex shrink-0 items-center gap-0.5">
            <CmsOrderActions isFirst={index === 0} isLast={index === total - 1} isPending={isReordering} onMoveUp={() => onReorder('up')} onMoveDown={() => onReorder('down')} />
            <Button variant="ghost" size="icon-sm" aria-label={item.isPublished ? `Unpublish ${item.title}` : `Publish ${item.title}`} title={item.isPublished ? 'Unpublish' : 'Publish'} disabled={isPublishing} onClick={onPublish} className="size-7 text-zinc-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40">{item.isPublished ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</Button>
            <Link href={`/admin/cms/gallery/${item.id}/edit`} aria-label={`Edit ${item.title}`} className="inline-flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:hover:bg-zinc-800 dark:hover:text-white"><Pencil className="size-3.5" /></Link>
            <CmsDeleteDialog title={item.title} onConfirm={onDelete} isPending={isDeleting} trigger={<Button variant="ghost" size="icon-sm" aria-label={`Hapus ${item.title}`} className="size-7 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 className="size-3.5" /></Button>} />
          </div>
        </div>
      </div>
    </article>
  );
}

function GallerySkeleton() {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="overflow-hidden rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900"><div className="aspect-[16/10] animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" /><div className="space-y-2 px-1 py-3"><div className="h-2.5 w-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" /><div className="h-3.5 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" /><div className="h-2.5 w-1/2 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" /></div></div>)}</div>;
}

function GalleryPagination({ page, totalPages, totalItems, onPageChange }: { page: number; totalPages: number; totalItems: number; onPageChange: (page: number) => void }) {
  const start = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalItems);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((number) => number === 1 || number === totalPages || Math.abs(number - page) <= 1);

  return <div className="flex flex-col gap-3 border-t border-zinc-200 bg-white px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] text-zinc-500">Menampilkan {start}–{end} dari {totalItems} foto</p><nav aria-label="Halaman gallery" className="flex items-center gap-1"><Button variant="outline" size="icon-sm" aria-label="Halaman sebelumnya" disabled={page === 1} onClick={() => onPageChange(page - 1)} className="size-7 rounded-md border-zinc-200 dark:border-zinc-700"><ChevronLeft className="size-3.5" /></Button>{pages.map((number, index) => <span key={number} className="contents">{index > 0 && number - pages[index - 1] > 1 && <span className="px-1 text-xs text-zinc-400">…</span>}<Button variant={number === page ? 'default' : 'outline'} size="icon-sm" aria-label={`Halaman ${number}`} aria-current={number === page ? 'page' : undefined} onClick={() => onPageChange(number)} className={`size-7 rounded-md text-[11px] ${number === page ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900' : 'border-zinc-200 dark:border-zinc-700'}`}>{number}</Button></span>)}<Button variant="outline" size="icon-sm" aria-label="Halaman berikutnya" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} className="size-7 rounded-md border-zinc-200 dark:border-zinc-700"><ChevronRight className="size-3.5" /></Button></nav></div>;
}

export default function GalleryPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const gallery = useQuery({ queryKey: ['cms', 'gallery'], queryFn: cmsApi.listGallery });
  const categories = useQuery({ queryKey: ['cms', 'categories'], queryFn: cmsApi.listCategories });
  const remove = useMutation({
    mutationFn: cmsApi.deleteGallery,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cms', 'gallery'] }); toast.success('Foto gallery dihapus.'); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Foto gagal dihapus.'),
  });
  const reorder = useMutation({ mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) => cmsApi.reorderGallery(id, direction), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cms', 'gallery'] }), onError: (error) => toast.error(error instanceof Error ? error.message : 'Urutan gagal diubah.') });
  const publish = useMutation({ mutationFn: ({ item, isPublished }: { item: GalleryItem; isPublished: boolean }) => cmsApi.updateGallery(item.id, { isPublished }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cms', 'gallery'] }), onError: (error) => toast.error(error instanceof Error ? error.message : 'Status gagal diubah.') });
  const items = useMemo(() => (gallery.data ?? []).filter((item) => (activeCategory === 'all' || (activeCategory === 'uncategorized' ? !item.categoryId : item.categoryId === activeCategory)) && `${item.title} ${item.category?.name ?? ''} ${item.location ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())), [gallery.data, search, activeCategory]);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const tabs = [{ value: 'all', label: 'Semua' }, ...(categories.data ?? []).map((category) => ({ value: category.id, label: category.name })), { value: 'uncategorized', label: 'Tanpa kategori' }];

  return <div className="space-y-5">
    <CmsPageHeader title="Gallery" description="Atur foto yang tampil di halaman portfolio." icon={ImageIcon} createAction={<Link href="/admin/cms/gallery/new"><Button className="h-8 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"><Plus className="mr-1 size-3.5" />Tambah Foto</Button></Link>} />
    {gallery.isError ? <CmsErrorState message={gallery.error instanceof Error ? gallery.error.message : 'Terjadi kesalahan.'} retry={() => gallery.refetch()} /> : <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Koleksi foto</h2><p className="mt-0.5 text-[11px] text-zinc-500">Cari dan filter foto untuk dikelola.</p></div><div className="flex w-full flex-wrap items-center gap-2 sm:w-auto"><div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari foto..." aria-label="Cari foto gallery" className="h-8 w-full rounded-md border-zinc-200 bg-white pl-8 text-xs dark:border-zinc-700 dark:bg-zinc-900" /></div><Select value={activeCategory} onValueChange={(value) => { if (value) { setActiveCategory(value); setPage(1); } }}><SelectTrigger size="sm" className="h-8 w-auto min-w-32 rounded-md border-zinc-200 bg-white text-xs dark:border-zinc-700 dark:bg-zinc-900"><SelectValue placeholder="Kategori" /></SelectTrigger><SelectContent>{tabs.map((tab) => <SelectItem key={tab.value} value={tab.value}>{tab.label}</SelectItem>)}</SelectContent></Select>{(search || activeCategory !== 'all') && <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(''); setActiveCategory('all'); setPage(1); }} className="h-8 rounded-md px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><RotateCcw className="mr-1 size-3.5" />Clear filter</Button>}</div></div></div>
      <div className="bg-[#f7f8fa] p-3 dark:bg-zinc-950/40 sm:p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Semua foto</h3><span className="text-[11px] text-zinc-500">{items.length} foto</span></div>{gallery.isLoading ? <GallerySkeleton /> : items.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-white px-4 text-center dark:border-zinc-800 dark:bg-zinc-900"><ImageIcon className="size-6 text-zinc-300 dark:text-zinc-600" /><p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">{search || activeCategory !== 'all' ? 'Foto tidak ditemukan' : 'Gallery masih kosong'}</p><p className="mt-1 text-xs text-zinc-500">{search || activeCategory !== 'all' ? 'Coba kata kunci atau kategori lain.' : 'Tambahkan foto pertama untuk memulai koleksi.'}</p>{!search && activeCategory === 'all' && <Link href="/admin/cms/gallery/new" className="mt-3"><Button size="sm" variant="outline">Tambah Foto</Button></Link>}</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleItems.map((item, index) => <GalleryCard key={item.id} item={item} index={(currentPage - 1) * PAGE_SIZE + index} total={items.length} onDelete={() => remove.mutate(item.id)} onReorder={(direction) => reorder.mutate({ id: item.id, direction })} onPublish={() => publish.mutate({ item, isPublished: !item.isPublished })} isDeleting={remove.isPending} isReordering={reorder.isPending} isPublishing={publish.isPending} />)}</div>}</div>
      {!gallery.isLoading && <GalleryPagination page={currentPage} totalPages={totalPages} totalItems={items.length} onPageChange={setPage} />}
    </section>}
  </div>;
}
