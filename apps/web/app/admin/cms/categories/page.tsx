'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderKanban, Pencil, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cmsApi, type GalleryCategory } from '@/lib/cms-api';
import { CmsDeleteDialog } from '../../components/cms-delete-dialog';
import { CmsPageHeader } from '../../components/cms-page-header';
import { CmsPagination, CmsTable, CmsTableSkeleton, CmsTableTabs } from '../../components/cms-table';
import { CmsErrorState } from '../../components/cms-state';
import { CategoryDialog } from './category-dialog';

const PAGE_SIZE = 12;

export default function GalleryCategoriesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryCategory>();
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ['cms', 'categories'], queryFn: cmsApi.listCategories });
  const remove = useMutation({ mutationFn: cmsApi.deleteCategory, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cms', 'categories'] }); queryClient.invalidateQueries({ queryKey: ['cms', 'gallery'] }); toast.success('Kategori gallery dihapus.'); }, onError: (error) => toast.error(error instanceof Error ? error.message : 'Kategori gagal dihapus.') });
  const items = useMemo(() => (categories.data ?? []).filter((item) => (statusFilter === 'all' || (statusFilter === 'active' ? item.isActive : !item.isActive)) && `${item.name} ${item.slug} ${item.description ?? ''}`.toLowerCase().includes(search.toLowerCase())), [categories.data, search, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const openCreate = () => { setEditing(undefined); setDialogOpen(true); };
  const openEdit = (category: GalleryCategory) => { setEditing(category); setDialogOpen(true); };
  const columns = [
    { key: 'name', header: 'Kategori', render: (item: GalleryCategory) => <div><p className="font-semibold text-zinc-900 dark:text-white">{item.name}</p><p className="text-xs text-zinc-500">/{item.slug}</p></div> },
    { key: 'description', header: 'Deskripsi', className: 'max-w-sm', render: (item: GalleryCategory) => <span className="block truncate text-zinc-600 dark:text-zinc-400">{item.description || '—'}</span> },
    { key: 'status', header: 'Status', render: (item: GalleryCategory) => <Badge className={item.isActive ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-500'}>{item.isActive ? 'Aktif' : 'Nonaktif'}</Badge> },
    { key: 'photos', header: 'Foto', render: (item: GalleryCategory) => <span className="text-zinc-600 dark:text-zinc-400">{item._count?.galleryItems ?? 0}</span> },
    { key: 'actions', header: '', className: 'text-right', render: (item: GalleryCategory) => <div className="flex justify-end gap-1"><Button variant="ghost" size="sm" className="text-amber-600" onClick={() => openEdit(item)}><Pencil className="mr-1 size-3.5" />Edit</Button><CmsDeleteDialog title={item.name} entityLabel="kategori gallery" onConfirm={() => remove.mutate(item.id)} isPending={remove.isPending} /></div> },
  ];
  const toolbar = <><CmsTableTabs tabs={[{ value: 'all', label: 'Semua' }, { value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]} activeTab={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1); }} /><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari kategori..." className="h-9 rounded-lg pl-9 text-xs" /></div></>;
  const emptyContent = <div className="flex flex-col items-center justify-center gap-2 py-5"><FolderKanban className="size-8 text-zinc-300 dark:text-zinc-600" /><p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{search || statusFilter !== 'all' ? 'Kategori tidak ditemukan' : 'Belum ada kategori'}</p><p className="text-xs text-zinc-500">{search || statusFilter !== 'all' ? 'Ubah filter atau kata kunci pencarian.' : 'Tambahkan kategori pertama untuk gallery.'}</p>{!search && statusFilter === 'all' && <Button size="sm" onClick={openCreate} className="mt-1 bg-amber-500 text-zinc-950 hover:bg-amber-600"><Plus className="mr-1 size-3.5" />Tambah Kategori</Button>}</div>;

  return <div className="space-y-6"><CmsPageHeader title="Kategori Gallery" description="Kelola pengelompokan foto untuk portfolio Kayastory." icon={FolderKanban} createAction={<Button onClick={openCreate} className="h-9 bg-amber-500 text-xs font-bold text-zinc-950 hover:bg-amber-600"><Plus className="mr-1.5 size-3.5" />Tambah Kategori</Button>} />{categories.isLoading ? <CmsTableSkeleton /> : categories.isError ? <CmsErrorState message={categories.error instanceof Error ? categories.error.message : 'Terjadi kesalahan.'} retry={() => categories.refetch()} /> : <><CmsTable toolbar={toolbar} columns={columns} rows={visibleItems} emptyContent={emptyContent} /><CmsPagination page={currentPage} totalPages={totalPages} totalItems={items.length} pageSize={PAGE_SIZE} itemLabel="kategori" onPageChange={setPage} /></>}<CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editing} /></div>;
}
