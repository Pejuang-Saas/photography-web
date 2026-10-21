'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  ImageOff,
  MessageSquareQuote,
  MessageSquareText,
  PencilRuler,
  Trash2,
  Users,
} from 'lucide-react';
import PhotoPreview from '@/app/gallery/_components/PhotoPreview';
import { errorMessage } from '@/lib/admin-queries';
import { formatDateTime } from '@/lib/format';
import {
  useGallerySelection,
  useGallerySelections,
  useRemoveSelection,
} from '@/lib/gallery-queries';
import { cn } from '@/lib/utils';
import type {
  NotedPhoto,
  Photo,
  RevisedPhoto,
  SelectionStatus,
  SelectionSummary,
} from '@/types/gallery';
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

/** One thumbnail with its filename; the customer's words sit under it, set apart so they are seen. */
function PhotoTile({
  photo,
  text,
  tone,
  onOpen,
}: {
  photo: NotedPhoto | RevisedPhoto;
  text: string | null;
  /** Revisions are asks the studio must act on; notes are context. */
  tone: 'note' | 'revision';
  onOpen: () => void;
}) {
  return (
    <li className="flex flex-col gap-1.5">
      <button
        type="button"
        aria-label={`Perbesar ${photo.filename}`}
        onClick={onOpen}
        className="relative block aspect-[4/5] w-full overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800"
      >
        {photo.thumbnailUrl ? (
          <Image
            src={photo.thumbnailUrl}
            alt={photo.filename}
            fill
            sizes="220px"
            unoptimized
            referrerPolicy="no-referrer"
            className="object-cover transition-transform hover:scale-[1.04]"
          />
        ) : (
          <ImageOff className="m-auto size-5 text-zinc-400" />
        )}
      </button>
      <p className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {photo.filename}
      </p>
      {text && (
        <p
          className={cn(
            'whitespace-pre-wrap break-words rounded-md border-l-2 px-2.5 py-1.5 text-xs leading-snug',
            tone === 'revision'
              ? 'border-rose-500 bg-rose-500/10 text-zinc-900 dark:text-zinc-100'
              : 'border-amber-500 bg-amber-500/10 text-zinc-900 dark:text-zinc-100',
          )}
        >
          {text}
        </p>
      )}
    </li>
  );
}

const TILE_GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6';

function GroupHeading({
  icon: Icon,
  title,
  hint,
  tone,
}: {
  icon: typeof PencilRuler;
  title: string;
  hint?: string;
  tone: 'note' | 'revision' | 'plain';
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <h4 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
        <Icon
          className={cn(
            'size-4',
            tone === 'revision'
              ? 'text-rose-500'
              : tone === 'note'
                ? 'text-amber-600'
                : 'text-zinc-500',
          )}
        />
        {title}
      </h4>
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </div>
  );
}

/** What one customer chose and asked for: revisions first (they need action), then the picks. */
function ChosenPhotos({ galleryId, selectionId }: { galleryId: string; selectionId: string }) {
  const selection = useGallerySelection(galleryId, selectionId);
  const [preview, setPreview] = useState<{ list: 'picks' | 'revisions'; index: number } | null>(
    null,
  );
  const photos = selection.data?.selectedPhotos ?? [];
  const revisions = selection.data?.revisions ?? [];

  if (selection.isLoading) return <QueryLoading rows={1} />;
  if (selection.isError) {
    return (
      <p role="alert" className="text-sm text-rose-600">
        {errorMessage(selection.error)}
      </p>
    );
  }
  if (photos.length === 0 && revisions.length === 0) {
    return <p className="text-sm text-zinc-500">Belum ada foto yang dipilih.</p>;
  }

  const notedCount = photos.filter((photo) => photo.note).length;
  const shown = preview?.list === 'revisions' ? revisions : photos;
  const noteOf = (photo: Photo) =>
    preview?.list === 'revisions'
      ? revisions.find((row) => row.id === photo.id)?.note
      : photos.find((row) => row.id === photo.id)?.note;

  return (
    <div className="space-y-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
      {revisions.length > 0 && (
        <div className="space-y-3">
          <GroupHeading
            icon={PencilRuler}
            tone="revision"
            title={`Permintaan revisi (${revisions.length})`}
            hint="Foto hasil edit yang perlu dikerjakan ulang"
          />
          <ul className={TILE_GRID}>
            {revisions.map((photo, index) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                text={photo.note}
                tone="revision"
                onOpen={() => setPreview({ list: 'revisions', index })}
              />
            ))}
          </ul>
        </div>
      )}
      {photos.length > 0 && (
        <div className="space-y-3">
          <GroupHeading
            icon={MessageSquareText}
            tone="plain"
            title={`Foto pilihan (${photos.length})`}
            hint={notedCount > 0 ? `${notedCount} dengan catatan` : undefined}
          />
          <ul className={TILE_GRID}>
            {photos.map((photo, index) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                text={photo.note}
                tone="note"
                onOpen={() => setPreview({ list: 'picks', index })}
              />
            ))}
          </ul>
        </div>
      )}
      <PhotoPreview
        photos={shown}
        index={preview?.index ?? null}
        selectedIds={NO_SELECTION}
        disabled
        hideSelect
        onToggle={() => undefined}
        onNavigate={(index) => setPreview((current) => current && { ...current, index })}
        onClose={() => setPreview(null)}
        footer={(photo) => {
          const note = noteOf(photo);
          return note ? (
            <div className="text-xs">
              <p className="font-semibold text-zinc-300">
                {preview?.list === 'revisions' ? 'Permintaan revisi' : 'Catatan customer'}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{note}</p>
            </div>
          ) : null;
        }}
      />
    </div>
  );
}

/** A small count pill; lit up (amber) when it means the customer asked for something. */
function Chip({
  icon: Icon,
  children,
  tone = 'plain',
}: {
  icon: typeof Users;
  children: React.ReactNode;
  tone?: 'plain' | 'note' | 'revision';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        tone === 'revision' && 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
        tone === 'note' && 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
        tone === 'plain' && 'border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400',
      )}
    >
      <Icon className="size-3.5" />
      {children}
    </span>
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
  const needsAction = selection.revisionCount > 0;

  return (
    <Card
      className={cn(
        'rounded-xl bg-white shadow-sm dark:bg-zinc-900/60',
        needsAction ? 'border-rose-500/40' : 'border-zinc-200/80 dark:border-zinc-800/80',
      )}
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold uppercase text-amber-700 dark:text-amber-400"
            >
              {selection.customerName.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {selection.customerName}
                </h3>
                <StatusBadge status={selection.status} />
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                {contact || 'Tanpa kontak'}
                {selection.submittedAt && ` · dikirim ${formatDateTime(selection.submittedAt)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-expanded={open}
              onClick={onToggle}
              className="gap-1.5"
            >
              {open ? 'Tutup detail' : 'Lihat detail'}
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

        <div className="flex flex-wrap gap-2">
          <Chip icon={ImageIcon}>{selection.selectedCount} foto dipilih</Chip>
          {selection.noteCount > 0 && (
            <Chip icon={MessageSquareText} tone="note">
              {selection.noteCount} catatan foto
            </Chip>
          )}
          {selection.revisionCount > 0 && (
            <Chip icon={PencilRuler} tone="revision">
              {selection.revisionCount} permintaan revisi
            </Chip>
          )}
        </div>

        {selection.generalNote && (
          <figure className="rounded-lg border-l-4 border-amber-500 bg-amber-500/10 px-4 py-3">
            <figcaption className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <MessageSquareQuote className="size-3.5" />
              Pesan dari {selection.customerName}
            </figcaption>
            <blockquote className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
              {selection.generalNote}
            </blockquote>
          </figure>
        )}

        {open && <ChosenPhotos galleryId={galleryId} selectionId={selection.id} />}
      </CardContent>
    </Card>
  );
}

/** What each customer picked, right on the gallery's page. */
export default function SelectionsSection({ galleryId }: { galleryId: string }) {
  const [status, setStatus] = useState<SelectionStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  // undefined: not touched yet, so a lone customer is shown open; null: the admin closed it.
  const [openId, setOpenId] = useState<string | null | undefined>(undefined);
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
                open={
                  (openId === undefined
                    ? selections.data.items.length === 1
                      ? selections.data.items[0].id
                      : null
                    : openId) === selection.id
                }
                onToggle={() => {
                  const current =
                    openId === undefined && selections.data.items.length === 1
                      ? selections.data.items[0].id
                      : openId;
                  setOpenId(current === selection.id ? null : selection.id);
                }}
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
