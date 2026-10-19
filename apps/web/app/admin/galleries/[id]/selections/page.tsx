'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, Users } from 'lucide-react';
import { errorMessage } from '@/lib/admin-queries';
import { formatDateTime } from '@/lib/format';
import { useGallery, useGallerySelection, useGallerySelections } from '@/lib/gallery-queries';
import type { SelectionStatus } from '@/types/gallery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { CmsPageHeader } from '../../../components/cms-page-header';
import { QueryError, QueryLoading } from '../../../components/query-state';

const FILTERS: { value: SelectionStatus | undefined; label: string }[] = [
  { value: undefined, label: 'Semua' },
  { value: 'SUBMITTED', label: 'Terkirim' },
  { value: 'DRAFT', label: 'Draft' },
];

function SelectionStatusBadge({ status }: { status: SelectionStatus }) {
  return status === 'SUBMITTED' ? (
    <Badge
      variant="outline"
      className="border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-400"
    >
      Terkirim
    </Badge>
  ) : (
    <Badge variant="outline" className="text-[11px]">
      Draft
    </Badge>
  );
}

function SelectionDialog({
  galleryId,
  selectionId,
  onClose,
}: {
  galleryId: string;
  selectionId: string | null;
  onClose: () => void;
}) {
  const selection = useGallerySelection(galleryId, selectionId);
  const data = selection.data;

  return (
    <Dialog open={Boolean(selectionId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{data?.customerName ?? 'Pilihan customer'}</DialogTitle>
          <DialogDescription>
            {data
              ? [data.customerEmail, data.customerPhone].filter(Boolean).join(' · ') ||
                'Tanpa kontak'
              : 'Memuat…'}
          </DialogDescription>
        </DialogHeader>
        {selection.isLoading && <QueryLoading rows={2} />}
        {selection.isError && (
          <p role="alert" className="text-sm text-rose-600">
            {errorMessage(selection.error)}
          </p>
        )}
        {data && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              {data.selectedPhotos.length} foto dipilih
              {data.submittedAt && ` · dikirim ${formatDateTime(data.submittedAt)}`}
            </p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {data.selectedPhotos.map((photo) => (
                <li key={photo.id} className="space-y-1">
                  <a
                    href={photo.viewUrl ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block aspect-[4/5] overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800"
                  >
                    {photo.thumbnailUrl ? (
                      <Image
                        src={photo.thumbnailUrl}
                        alt={photo.filename}
                        fill
                        sizes="160px"
                        unoptimized
                        referrerPolicy="no-referrer"
                        className="object-cover"
                      />
                    ) : (
                      <ImageOff className="m-auto size-5 text-zinc-400" />
                    )}
                  </a>
                  <p className="truncate text-[11px] text-zinc-600 dark:text-zinc-400">
                    {photo.filename}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function GallerySelectionsPage() {
  const { id } = useParams<{ id: string }>();
  const gallery = useGallery(id);
  const [status, setStatus] = useState<SelectionStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const selections = useGallerySelections(id, { page, status });

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Pilihan Customer"
        description={gallery.data?.name ?? 'Foto yang dipilih customer dari galeri ini.'}
        icon={Users}
        backHref={`/admin/galleries/${id}`}
      />

      <div role="tablist" aria-label="Filter status" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            role="tab"
            aria-selected={status === filter.value}
            onClick={() => {
              setStatus(filter.value);
              setPage(1);
            }}
            className={cn(
              'rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors',
              status === filter.value
                ? 'border-amber-500 bg-amber-500/10 text-zinc-900 dark:text-white'
                : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {selections.isLoading ? (
        <QueryLoading rows={3} />
      ) : selections.isError || !selections.data ? (
        <QueryError
          title="Pilihan tidak dapat dimuat"
          message={errorMessage(selections.error)}
          retry={() => selections.refetch()}
        />
      ) : selections.data.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 py-14 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Belum ada customer yang membuka galeri ini.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Dipilih</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dikirim</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selections.data.items.map((selection) => (
                  <TableRow key={selection.id}>
                    <TableCell className="font-semibold text-zinc-900 dark:text-white">
                      {selection.customerName}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {selection.customerEmail ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {selection.selectedCount}
                    </TableCell>
                    <TableCell>
                      <SelectionStatusBadge status={selection.status} />
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {selection.submittedAt ? formatDateTime(selection.submittedAt) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setOpenId(selection.id)}>
                        Lihat foto
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
            <span>
              {selections.data.total} sesi · halaman {selections.data.page} dari{' '}
              {selections.data.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="gap-1"
              >
                <ChevronLeft className="size-3.5" />
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= selections.data.totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="gap-1"
              >
                Berikutnya
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}

      <SelectionDialog galleryId={id} selectionId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
