'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ImageOff, Trash2, Users } from 'lucide-react';
import PhotoPreview from '@/app/gallery/_components/PhotoPreview';
import { errorMessage } from '@/lib/admin-queries';
import { formatDateTime } from '@/lib/format';
import {
  useGallerySelection,
  useGallerySelections,
  useRemoveSelection,
} from '@/lib/gallery-queries';
import { cn } from '@/lib/utils';
import type { SelectionStatus, SelectionSummary } from '@/types/gallery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CmsDeleteDialog } from '../../components/cms-delete-dialog';
import { QueryError, QueryLoading } from '../../components/query-state';

const NO_SELECTION = new Set<string>();

const FILTERS: { value: SelectionStatus | undefined; label: string }[] = [
  { value: undefined, label: 'Semua' },
  { value: 'SUBMITTED', label: 'Terkirim' },
  { value: 'DRAFT', label: 'Draft' },
];

function StatusBadge({ status }: { status: SelectionStatus }) {
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

/** The photos one customer chose, in a grid under their row; a click opens one larger. */
function ChosenPhotos({ galleryId, selectionId }: { galleryId: string; selectionId: string }) {
  const selection = useGallerySelection(galleryId, selectionId);
  const [index, setIndex] = useState<number | null>(null);
  const photos = selection.data?.selectedPhotos ?? [];

  if (selection.isLoading) return <QueryLoading rows={1} />;
  if (selection.isError) {
    return (
      <p role="alert" className="text-sm text-rose-600">
        {errorMessage(selection.error)}
      </p>
    );
  }
  if (photos.length === 0) {
    return <p className="text-sm text-zinc-500">Belum ada foto yang dipilih.</p>;
  }

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
        {photos.map((photo, position) => (
          <li key={photo.id} className="space-y-1">
            <button
              type="button"
              aria-label={`Perbesar ${photo.filename}`}
              onClick={() => setIndex(position)}
              className="relative block aspect-[4/5] w-full overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800"
            >
              {photo.thumbnailUrl ? (
                <Image
                  src={photo.thumbnailUrl}
                  alt={photo.filename}
                  fill
                  sizes="160px"
                  unoptimized
                  referrerPolicy="no-referrer"
                  className="object-cover transition-transform hover:scale-[1.04]"
                />
              ) : (
                <ImageOff className="m-auto size-5 text-zinc-400" />
              )}
            </button>
            <p className="truncate text-[11px] text-zinc-600 dark:text-zinc-400">
              {photo.filename}
            </p>
          </li>
        ))}
      </ul>
      <PhotoPreview
        photos={photos}
        index={index}
        selectedIds={NO_SELECTION}
        disabled
        hideSelect
        onToggle={() => undefined}
        onNavigate={setIndex}
        onClose={() => setIndex(null)}
      />
    </>
  );
}

function SelectionRow({
  galleryId,
  selection,
  open,
  onToggle,
}: {
  galleryId: string;
  selection: SelectionSummary;
  open: boolean;
  onToggle: () => void;
}) {
  const contact = [selection.customerEmail, selection.customerPhone].filter(Boolean).join(' · ');
  const remove = useRemoveSelection(galleryId);

  return (
    <Card className="rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {selection.customerName}
              </h3>
              <StatusBadge status={selection.status} />
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              {contact || 'Tanpa kontak'}
              {selection.submittedAt && ` · dikirim ${formatDateTime(selection.submittedAt)}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
              {selection.selectedCount} foto
            </span>
            <Button
              variant="outline"
              size="sm"
              aria-expanded={open}
              onClick={onToggle}
              className="gap-1.5"
            >
              {open ? 'Tutup foto' : 'Lihat foto'}
              <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
            </Button>
            <CmsDeleteDialog
              title={selection.customerName}
              entityLabel="customer"
              description={
                <>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {selection.customerName}
                  </span>{' '}
                  dilepas dari galeri ini: {selection.selectedCount} foto pilihannya
                  {selection.status === 'SUBMITTED' ? ' yang sudah dikirim' : ''} dihapus permanen
                  dan tempatnya di kuota kosong lagi. Customer bisa memilih dari awal kalau masih
                  ada tempat.
                </>
              }
              isPending={remove.isPending}
              onConfirm={() => remove.mutate(selection.id)}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Lepas ${selection.customerName}`}
                  className="h-8 gap-1.5 text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="size-3.5" />
                  Lepas
                </Button>
              }
            />
          </div>
        </div>
        {open && <ChosenPhotos galleryId={galleryId} selectionId={selection.id} />}
      </CardContent>
    </Card>
  );
}

/** What each customer picked, right on the gallery's page. */
export default function SelectionsSection({ galleryId }: { galleryId: string }) {
  const [status, setStatus] = useState<SelectionStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const selections = useGallerySelections(galleryId, { page, status });

  return (
    <section id="pilihan" className="space-y-4 scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
          <Users className="size-4 text-amber-600" />
          Pilihan Customer
        </h2>
        <div role="tablist" aria-label="Filter status pilihan" className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              role="tab"
              aria-selected={status === filter.value}
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
                setOpenId(null);
              }}
              className={cn(
                'rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors',
                status === filter.value
                  ? 'border-amber-500 bg-amber-500/10 text-zinc-900 dark:text-white'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {selections.isLoading ? (
        <QueryLoading rows={2} />
      ) : selections.isError || !selections.data ? (
        <QueryError
          title="Pilihan tidak dapat dimuat"
          message={errorMessage(selections.error)}
          retry={() => selections.refetch()}
        />
      ) : selections.data.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          {status
            ? 'Tidak ada pilihan dengan status ini.'
            : 'Belum ada customer yang membuka galeri ini.'}
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {selections.data.items.map((selection) => (
              <SelectionRow
                key={selection.id}
                galleryId={galleryId}
                selection={selection}
                open={openId === selection.id}
                onToggle={() => setOpenId(openId === selection.id ? null : selection.id)}
              />
            ))}
          </div>
          {selections.data.totalPages > 1 && (
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
          )}
        </>
      )}
    </section>
  );
}
