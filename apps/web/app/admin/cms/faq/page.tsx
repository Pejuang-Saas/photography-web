'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, HelpCircle, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cmsApi, type FaqItem } from '@/lib/cms-api';
import { CmsDeleteDialog } from '../../components/cms-delete-dialog';
import { CmsPageHeader } from '../../components/cms-page-header';
import { CmsErrorState } from '../../components/cms-state';
import { CmsPagination, CmsTable, CmsTableSkeleton } from '../../components/cms-table';
import { CmsOrderActions } from '../../components/cms-order-actions';
import { FaqDialog } from './faq-dialog';

const PAGE_SIZE = 10;

export default function FaqPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FaqItem>();
  const queryClient = useQueryClient();
  const faq = useQuery({ queryKey: ['cms', 'faq'], queryFn: cmsApi.listFaq });
  const remove = useMutation({ mutationFn: cmsApi.deleteFaq, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cms', 'faq'] }); toast.success('FAQ dihapus.'); }, onError: (error) => toast.error(error instanceof Error ? error.message : 'FAQ gagal dihapus.') });
  const reorder = useMutation({ mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) => cmsApi.reorderFaq(id, direction), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cms', 'faq'] }), onError: (error) => toast.error(error instanceof Error ? error.message : 'Urutan gagal diubah.') });
  const publish = useMutation({ mutationFn: ({ item, isPublished }: { item: FaqItem; isPublished: boolean }) => cmsApi.updateFaq(item.id, { isPublished }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cms', 'faq'] }), onError: (error) => toast.error(error instanceof Error ? error.message : 'Status gagal diubah.') });
  const items = useMemo(() => (faq.data ?? []).filter((item) => `${item.question} ${item.answer}`.toLowerCase().includes(search.trim().toLowerCase())), [faq.data, search]);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const openCreate = () => { setEditing(undefined); setDialogOpen(true); };
  const openEdit = (item: FaqItem) => { setEditing(item); setDialogOpen(true); };
  const columns = [
    { key: 'question', header: 'Pertanyaan & jawaban', render: (item: FaqItem) => <div className="min-w-0"><p className="max-w-2xl truncate font-semibold text-zinc-900 dark:text-white">{item.question}</p><p className="mt-1 max-w-2xl truncate text-xs text-zinc-500">{item.answer}</p></div> },
    { key: 'status', header: 'Status', render: (item: FaqItem) => <Badge className={item.isPublished ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-500'}>{item.isPublished ? 'Published' : 'Draft'}</Badge> },
    { key: 'actions', header: '', className: 'text-right', render: (item: FaqItem) => { const index = items.findIndex((entry) => entry.id === item.id); return <div className="flex justify-end gap-1"><CmsOrderActions isFirst={index <= 0} isLast={index === items.length - 1} isPending={reorder.isPending} onMoveUp={() => reorder.mutate({ id: item.id, direction: 'up' })} onMoveDown={() => reorder.mutate({ id: item.id, direction: 'down' })} /><Button variant="ghost" size="icon-sm" aria-label={item.isPublished ? `Unpublish ${item.question}` : `Publish ${item.question}`} title={item.isPublished ? 'Unpublish' : 'Publish'} disabled={publish.isPending} onClick={() => publish.mutate({ item, isPublished: !item.isPublished })} className="text-zinc-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40">{item.isPublished ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</Button><Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><Pencil className="mr-1 size-3.5" />Edit</Button><CmsDeleteDialog title={item.question} entityLabel="FAQ" onConfirm={() => remove.mutate(item.id)} isPending={remove.isPending} trigger={<Button variant="ghost" size="icon-sm" aria-label={`Hapus ${item.question}`} className="text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 className="size-3.5" /></Button>} /></div>; } },
  ];
  const emptyContent = <div className="flex flex-col items-center justify-center gap-2 py-6"><HelpCircle className="size-7 text-zinc-300 dark:text-zinc-600" /><p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{search ? 'FAQ tidak ditemukan' : 'Belum ada FAQ'}</p><p className="text-xs text-zinc-500">{search ? 'Ubah kata kunci pencarian.' : 'Tambahkan pertanyaan pertama untuk landing page.'}</p>{!search && <Button size="sm" onClick={openCreate} className="mt-1 bg-amber-500 text-zinc-950 hover:bg-amber-600"><Plus className="mr-1 size-3.5" />Tambah FAQ</Button>}</div>;

  return <div className="space-y-6"><CmsPageHeader title="FAQ" description="Kelola pertanyaan yang sering ditanyakan customer." icon={HelpCircle} createAction={<Button onClick={openCreate} className="h-9 bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"><Plus className="mr-1.5 size-3.5" />Tambah FAQ</Button>} />{faq.isLoading ? <CmsTableSkeleton columns={4} /> : faq.isError ? <CmsErrorState message={faq.error instanceof Error ? faq.error.message : 'Terjadi kesalahan.'} retry={() => faq.refetch()} /> : <><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari pertanyaan atau jawaban..." className="h-9 rounded-lg pl-8 text-xs" /></div><CmsTable columns={columns} rows={visibleItems} emptyContent={emptyContent} /><CmsPagination page={currentPage} totalPages={totalPages} totalItems={items.length} pageSize={PAGE_SIZE} itemLabel="FAQ" onPageChange={setPage} /></>}<FaqDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editing} /></div>;
}
