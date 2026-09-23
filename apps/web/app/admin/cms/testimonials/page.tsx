'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, MessageSquareQuote, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cmsApi, type Testimonial } from '@/lib/cms-api';
import { CmsDeleteDialog } from '../../components/cms-delete-dialog';
import { CmsPageHeader } from '../../components/cms-page-header';
import { CmsErrorState } from '../../components/cms-state';
import { CmsPagination, CmsTable, CmsTableSkeleton } from '../../components/cms-table';
import { CmsOrderActions } from '../../components/cms-order-actions';
import { TestimonialDialog } from './testimonial-dialog';

const PAGE_SIZE = 10;

export default function TestimonialsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial>();
  const queryClient = useQueryClient();
  const testimonials = useQuery({ queryKey: ['cms', 'testimonials'], queryFn: cmsApi.listTestimonials });
  const remove = useMutation({ mutationFn: cmsApi.deleteTestimonial, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cms', 'testimonials'] }); toast.success('Testimonial dihapus.'); }, onError: (error) => toast.error(error instanceof Error ? error.message : 'Testimonial gagal dihapus.') });
  const reorder = useMutation({ mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) => cmsApi.reorderTestimonial(id, direction), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cms', 'testimonials'] }), onError: (error) => toast.error(error instanceof Error ? error.message : 'Urutan gagal diubah.') });
  const publish = useMutation({ mutationFn: ({ item, isPublished }: { item: Testimonial; isPublished: boolean }) => cmsApi.updateTestimonial(item.id, { isPublished }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cms', 'testimonials'] }), onError: (error) => toast.error(error instanceof Error ? error.message : 'Status gagal diubah.') });
  const items = useMemo(() => (testimonials.data ?? []).filter((item) => `${item.customerName} ${item.customerRole ?? ''} ${item.university ?? ''} ${item.quote}`.toLowerCase().includes(search.trim().toLowerCase())), [testimonials.data, search]);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const openCreate = () => { setEditing(undefined); setDialogOpen(true); };
  const openEdit = (item: Testimonial) => { setEditing(item); setDialogOpen(true); };
  const columns = [
    { key: 'customer', header: 'Customer', render: (item: Testimonial) => <div className="flex min-w-0 items-center gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">{item.customerName.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="truncate font-semibold text-zinc-900 dark:text-white">{item.customerName}</p><p className="truncate text-xs text-zinc-500">{[item.customerRole, item.university].filter(Boolean).join(' · ') || 'Customer'}</p></div></div> },
    { key: 'quote', header: 'Testimoni', className: 'max-w-xl', render: (item: Testimonial) => <p className="max-w-xl truncate text-zinc-600 dark:text-zinc-400">“{item.quote}”</p> },
    { key: 'rating', header: 'Rating', render: (item: Testimonial) => <span className="inline-flex items-center gap-1 text-amber-500"><Star className="size-3.5 fill-current" />{item.rating}</span> },
    { key: 'status', header: 'Status', render: (item: Testimonial) => <Badge className={item.isPublished ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-500'}>{item.isPublished ? 'Published' : 'Draft'}</Badge> },
    { key: 'actions', header: '', className: 'text-right', render: (item: Testimonial) => { const index = items.findIndex((entry) => entry.id === item.id); return <div className="flex justify-end gap-1"><CmsOrderActions isFirst={index <= 0} isLast={index === items.length - 1} isPending={reorder.isPending} onMoveUp={() => reorder.mutate({ id: item.id, direction: 'up' })} onMoveDown={() => reorder.mutate({ id: item.id, direction: 'down' })} /><Button variant="ghost" size="icon-sm" aria-label={item.isPublished ? `Unpublish ${item.customerName}` : `Publish ${item.customerName}`} title={item.isPublished ? 'Unpublish' : 'Publish'} disabled={publish.isPending} onClick={() => publish.mutate({ item, isPublished: !item.isPublished })} className="text-zinc-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40">{item.isPublished ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</Button><Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><Pencil className="mr-1 size-3.5" />Edit</Button><CmsDeleteDialog title={item.customerName} entityLabel="testimonial" onConfirm={() => remove.mutate(item.id)} isPending={remove.isPending} trigger={<Button variant="ghost" size="icon-sm" aria-label={`Hapus testimonial ${item.customerName}`} className="text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 className="size-3.5" /></Button>} /></div>; } },
  ];
  const emptyContent = <div className="flex flex-col items-center justify-center gap-2 py-6"><MessageSquareQuote className="size-7 text-zinc-300 dark:text-zinc-600" /><p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{search ? 'Testimonial tidak ditemukan' : 'Belum ada testimonial'}</p><p className="text-xs text-zinc-500">{search ? 'Ubah kata kunci pencarian.' : 'Tambahkan cerita customer pertama.'}</p>{!search && <Button size="sm" onClick={openCreate} className="mt-1 bg-amber-500 text-zinc-950 hover:bg-amber-600"><Plus className="mr-1 size-3.5" />Tambah testimonial</Button>}</div>;

  return <div className="space-y-6"><CmsPageHeader title="Testimonial" description="Kelola cerita customer yang tampil di landing page." icon={MessageSquareQuote} createAction={<Button onClick={openCreate} className="h-9 bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"><Plus className="mr-1.5 size-3.5" />Tambah Testimonial</Button>} />{testimonials.isLoading ? <CmsTableSkeleton columns={5} /> : testimonials.isError ? <CmsErrorState message={testimonials.error instanceof Error ? testimonials.error.message : 'Terjadi kesalahan.'} retry={() => testimonials.refetch()} /> : <><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari customer atau testimoni..." className="h-9 rounded-lg pl-8 text-xs" /></div><CmsTable columns={columns} rows={visibleItems} emptyContent={emptyContent} /><CmsPagination page={currentPage} totalPages={totalPages} totalItems={items.length} pageSize={PAGE_SIZE} itemLabel="testimonial" onPageChange={setPage} /></>}<TestimonialDialog key={editing?.id ?? 'new'} open={dialogOpen} onOpenChange={setDialogOpen} item={editing} /></div>;
}
