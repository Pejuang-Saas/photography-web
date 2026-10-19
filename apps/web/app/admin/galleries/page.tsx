'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Images, Loader2, RefreshCw } from 'lucide-react';
import { errorMessage } from '@/lib/admin-queries';
import { formatDateTime } from '@/lib/format';
import { galleryLink } from '@/lib/gallery-url';
import { useGalleries, useLatestSync, useTriggerSync } from '@/lib/gallery-queries';
import type { AdminGalleryListItem, GalleryStatus } from '@/types/gallery';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
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
        className="gap-1.5"
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
          <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead className="text-right">Foto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sync Terakhir</TableHead>
                  <TableHead className="text-right">Pilihan Terkirim</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {galleries.data.items.map((gallery) => (
                  <TableRow key={gallery.id}>
                    <TableCell className="font-semibold text-zinc-900 dark:text-white">
                      <Link href={`/admin/galleries/${gallery.id}`} className="hover:underline">
                        {gallery.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{gallery.totalPhotos}</TableCell>
                    <TableCell>
                      <GalleryStatusBadge status={gallery.status} />
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {gallery.lastSyncAt ? formatDateTime(gallery.lastSyncAt) : 'Belum pernah'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {gallery.totalSubmissions}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <SyncCell gallery={gallery} />
                        <CopyLinkButton link={galleryLink(gallery)} label="Salin link" iconOnly />
                        <Link href={`/admin/galleries/${gallery.id}`}>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <Eye className="size-3.5" />
                            Detail
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

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
