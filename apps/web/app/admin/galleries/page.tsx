'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Images,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { errorMessage } from '@/lib/admin-queries';
import { formatDateTime } from '@/lib/format';
import { galleryLink } from '@/lib/gallery-url';
import {
  useDeleteGallery,
  useGalleries,
  useLatestSync,
  useTriggerSync,
} from '@/lib/gallery-queries';
import type { AdminGalleryListItem, GalleryStatus } from '@/types/gallery';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CmsDeleteDialog } from '../components/cms-delete-dialog';
import { CmsPageHeader } from '../components/cms-page-header';
import { QueryError, QueryLoading } from '../components/query-state';
import CopyLinkButton from './_components/copy-link-button';
import GalleryStatusBadge from './_components/gallery-status-badge';
import { isSyncing } from './_components/sync-status-card';

const FILTERS: { value: GalleryStatus | undefined; label: string }[] = [
  { value: undefined, label: 'Semua' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'ARCHIVED', label: 'Diarsipkan' },
];

function SyncCell({ gallery }: { gallery: AdminGalleryListItem }) {
  const latest = useLatestSync(gallery.id);
  const trigger = useTriggerSync();
  const job = latest.data;
  const running = isSyncing(job) || trigger.isPending;

  return (
    <div className="flex min-w-40 items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={running}
        onClick={() => trigger.mutate(gallery.id)}
        className="h-8 gap-1.5 border-zinc-300 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
      >
        {running ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="size-3.5" />
        )}
        Sync Drive
      </Button>
      {running && job && (
        <span className="text-xs tabular-nums text-zinc-500">
          {job.totalFiles ? `${job.syncedFiles}/${job.totalFiles}` : 'Membaca…'}
        </span>
      )}
      {!running && job?.status === 'FAILED' && (
        <span className="text-xs font-medium text-rose-600">Gagal</span>
      )}
    </div>
  );
}

const ICON_BUTTON =
  'h-8 border-zinc-300 bg-white px-2.5 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700';

function DeleteCell({ gallery }: { gallery: AdminGalleryListItem }) {
  const remove = useDeleteGallery();
  return (
    <CmsDeleteDialog
      title={gallery.name}
      entityLabel="galeri"
      description={
        <>
          Galeri{' '}
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">“{gallery.name}”</span>{' '}
          akan dihapus permanen
          {gallery.totalSubmissions > 0
            ? `, termasuk ${gallery.totalSubmissions} pilihan customer yang sudah dikirim`
            : ', termasuk semua pilihan customer di dalamnya'}
          .{gallery.status === 'ACTIVE' && ' Tautan customer langsung berhenti bisa dibuka.'} Foto
          di Google Drive tidak terpengaruh.
        </>
      }
      isPending={remove.isPending}
      onConfirm={() => remove.mutate(gallery.id)}
      trigger={
        <Button
          variant="outline"
          size="sm"
          aria-label={`Hapus galeri ${gallery.name}`}
          className={`${ICON_BUTTON} hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40`}
        >
          <Trash2 className="size-3.5" />
        </Button>
      }
    />
  );
}

export default function GalleriesPage() {
  const [status, setStatus] = useState<GalleryStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const galleries = useGalleries({ page, status });

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Galeri Klien"
        description="Foto hasil sesi dari Google Drive yang dipilih customer lewat tautan khusus."
        icon={Images}
        createHref="/admin/galleries/new"
        createLabel="Buat Galeri"
      />

      <Tabs
        value={status ?? 'ALL'}
        onValueChange={(value) => {
          setStatus(value === 'ALL' ? undefined : (value as GalleryStatus));
          setPage(1);
        }}
        className="w-full lg:w-auto"
      >
        <TabsList className="flex h-10 items-center gap-1 rounded-xl border border-zinc-300/80 bg-zinc-200/70 p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {FILTERS.map((filter) => (
            <TabsTrigger
              key={filter.label}
              value={filter.value ?? 'ALL'}
              className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition-all hover:text-zinc-900 data-active:bg-white data-active:text-zinc-950 data-active:shadow-sm dark:text-zinc-400 dark:hover:text-white dark:data-active:bg-zinc-800 dark:data-active:text-white"
            >
              {filter.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {galleries.isLoading ? (
        <QueryLoading rows={4} />
      ) : galleries.isError || !galleries.data ? (
        <QueryError
          title="Galeri tidak dapat dimuat"
          message={errorMessage(galleries.error)}
          retry={() => galleries.refetch()}
        />
      ) : galleries.data.items.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 text-center dark:border-zinc-700">
          <Images className="size-8 text-zinc-400" />
          <p className="text-sm text-zinc-500">
            {status ? 'Tidak ada galeri dengan status ini.' : 'Belum ada galeri.'}
          </p>
          {!status && (
            <Link href="/admin/galleries/new">
              <Button size="sm">Buat galeri pertama</Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <Card className="overflow-hidden rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                  <tr>
                    <th className="p-3.5 pl-5 font-semibold">Nama</th>
                    <th className="p-3.5 text-right font-semibold">Foto</th>
                    <th className="p-3.5 font-semibold">Status</th>
                    <th className="p-3.5 font-semibold">Sync Terakhir</th>
                    <th className="p-3.5 text-right font-semibold">Pilihan Terkirim</th>
                    <th className="p-3.5 pr-5 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {galleries.data.items.map((gallery) => (
                    <tr
                      key={gallery.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <td className="p-3.5 pl-5">
                        <Link
                          href={`/admin/galleries/${gallery.id}`}
                          className="text-xs font-bold text-zinc-900 hover:underline dark:text-white"
                        >
                          {gallery.name}
                        </Link>
                      </td>
                      <td className="p-3.5 text-right tabular-nums text-zinc-800 dark:text-zinc-200">
                        {gallery.totalPhotos}
                      </td>
                      <td className="p-3.5">
                        <GalleryStatusBadge status={gallery.status} />
                      </td>
                      <td className="p-3.5 text-[11px] text-zinc-500">
                        {gallery.lastSyncAt ? formatDateTime(gallery.lastSyncAt) : 'Belum pernah'}
                      </td>
                      <td className="p-3.5 text-right tabular-nums text-zinc-800 dark:text-zinc-200">
                        {gallery.totalSubmissions}
                      </td>
                      <td className="p-3.5 pr-5">
                        <div className="flex items-center justify-end gap-2">
                          <SyncCell gallery={gallery} />
                          <CopyLinkButton link={galleryLink(gallery)} label="Salin link" iconOnly />
                          <Link href={`/admin/galleries/${gallery.id}/edit`}>
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`Edit galeri ${gallery.name}`}
                              className={ICON_BUTTON}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/admin/galleries/${gallery.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 border-zinc-300 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                            >
                              <Eye className="size-3.5 text-amber-500" />
                              Detail
                            </Button>
                          </Link>
                          <DeleteCell gallery={gallery} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
            <span>
              {galleries.data.total} galeri · halaman {galleries.data.page} dari{' '}
              {galleries.data.totalPages}
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
                disabled={page >= galleries.data.totalPages}
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
    </div>
  );
}
