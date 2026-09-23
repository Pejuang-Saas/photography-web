'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Eye, EyeOff, Megaphone, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cmsApi, type MarqueeItem } from '@/lib/cms-api';
import { CmsDeleteDialog } from '../../components/cms-delete-dialog';
import { CmsPageHeader } from '../../components/cms-page-header';
import { CmsErrorState } from '../../components/cms-state';
import { CmsPagination, CmsTable, CmsTableSkeleton } from '../../components/cms-table';
import { CmsOrderActions } from '../../components/cms-order-actions';
import { MarqueeDialog } from './marquee-dialog';

const PAGE_SIZE = 10;

export default function MarqueePage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MarqueeItem>();
  const queryClient = useQueryClient();
  const marquee = useQuery({ queryKey: ['cms', 'marquee'], queryFn: cmsApi.listMarquee });
  const remove = useMutation({ mutationFn: cmsApi.deleteMarquee, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cms', 'marquee'] }); toast.success('Marquee dihapus.'); }, onError: (error) => toast.error(error instanceof Error ? error.message : 'Marquee gagal dihapus.') });
  const reorder = useMutation({ mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) => cmsApi.reorderMarquee(id, direction), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cms', 'marquee'] }), onError: (error) => toast.error(error instanceof Error ? error.message : 'Urutan gagal diubah.') });
  const publish = useMutation({ mutationFn: ({ item, isActive }: { item: MarqueeItem; isActive: boolean }) => cmsApi.updateMarquee(item.id, { isActive }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cms', 'marquee'] }), onError: (error) => toast.error(error instanceof Error ? error.message : 'Status gagal diubah.') });
  const items = useMemo(() => (marquee.data ?? []).filter((item) => `${item.text} ${item.linkUrl ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())), [marquee.data, search]);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const openCreate = () => { setEditing(undefined); setDialogOpen(true); };
  const openEdit = (item: MarqueeItem) => { setEditing(item); setDialogOpen(true); };
  const columns = [
    { key: 'text', header: 'Teks marquee', render: (item: MarqueeItem) => <div className="min-w-0"><p className="max-w-xl truncate font-semibold text-zinc-900 dark:text-white">{item.text}</p>{item.linkUrl && <a href={item.linkUrl} target="_blank" rel="noreferrer" className="mt-1 flex max-w-xl items-center gap-1 truncate text-xs text-zinc-500 hover:text-amber-600"><ExternalLink className="size-3 shrink-0" />{item.linkUrl}</a>}</div> },
    { key: 'status', header: 'Status', render: (item: MarqueeItem) => <Badge className={item.isActive ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-500'}>{item.isActive ? 'Aktif' : 'Nonaktif'}</Badge> },
    { key: 'actions', header: '', className: 'text-right', render: (item: MarqueeItem) => { const index = items.findIndex((entry) => entry.id === item.id); return <div className="flex justify-end gap-1"><CmsOrderActions isFirst={index <= 0} isLast={index === items.length - 1} isPending={reorder.isPending} onMoveUp={() => reorder.mutate({ id: item.id, direction: 'up' })} onMoveDown={() => reorder.mutate({ id: item.id, direction: 'down' })} /><Button variant="ghost" size="icon-sm" aria-label={item.isActive ? `Nonaktifkan ${item.text}` : `Aktifkan ${item.text}`} title={item.isActive ? 'Nonaktifkan' : 'Aktifkan'} disabled={publish.isPending} onClick={() => publish.mutate({ item, isActive: !item.isActive })} className="text-zinc-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40">{item.isActive ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</Button><Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><Pencil className="mr-1 size-3.5" />Edit</Button><CmsDeleteDialog title={item.text} entityLabel="marquee" onConfirm={() => remove.mutate(item.id)} isPending={remove.isPending} trigger={<Button variant="ghost" size="icon-sm" aria-label={`Hapus ${item.text}`} className="text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 className="size-3.5" /></Button>} /></div>; } },
  ];
  const emptyContent = <div className="flex flex-col items-center justify-center gap-2 py-6"><Megaphone className="size-7 text-zinc-300 dark:text-zinc-600" /><p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{search ? 'Marquee tidak ditemukan' : 'Belum ada marquee'}</p><p className="text-xs text-zinc-500">{search ? 'Ubah kata kunci pencarian.' : 'Tambahkan teks marquee pertama.'}</p>{!search && <Button size="sm" onClick={openCreate} className="mt-1 bg-amber-500 text-zinc-950 hover:bg-amber-600"><Plus className="mr-1 size-3.5" />Tambah marquee</Button>}</div>;

  return <div className="space-y-6"><CmsPageHeader title="Marquee" description="Kelola teks berjalan yang tampil di landing page." icon={Megaphone} createAction={<Button onClick={openCreate} className="h-9 bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"><Plus className="mr-1.5 size-3.5" />Tambah Marquee</Button>} />{marquee.isLoading ? <CmsTableSkeleton columns={4} /> : marquee.isError ? <CmsErrorState message={marquee.error instanceof Error ? marquee.error.message : 'Terjadi kesalahan.'} retry={() => marquee.refetch()} /> : <><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari teks atau link..." className="h-9 rounded-lg pl-8 text-xs" /></div><CmsTable columns={columns} rows={visibleItems} emptyContent={emptyContent} /><CmsPagination page={currentPage} totalPages={totalPages} totalItems={items.length} pageSize={PAGE_SIZE} itemLabel="marquee" onPageChange={setPage} /></>}<MarqueeDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editing} /></div>;
}
