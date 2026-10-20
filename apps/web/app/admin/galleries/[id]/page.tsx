'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Archive, Eye, Images, Pencil, Trash2 } from 'lucide-react';
import { errorMessage } from '@/lib/admin-queries';
import { formatDateTime } from '@/lib/format';
import { galleryLink } from '@/lib/gallery-url';
import { useDeleteGallery, useGallery, useUpdateGallery } from '@/lib/gallery-queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CmsDeleteDialog } from '../../components/cms-delete-dialog';
import { CmsPageHeader } from '../../components/cms-page-header';
import { QueryError, QueryLoading } from '../../components/query-state';
import CopyLinkButton from '../_components/copy-link-button';
import GalleryStatusBadge from '../_components/gallery-status-badge';
import SelectionsSection from '../_components/selections-section';
import SyncStatusCard from '../_components/sync-status-card';

const CARD =
  'rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60';

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className={CARD}>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <p className="mt-1 text-2xl font-extrabold tabular-nums text-zinc-900 dark:text-white">
          {value}
        </p>
        {hint && <p className="mt-0.5 text-[11px] text-zinc-500">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr]">
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-zinc-900 dark:text-zinc-100">{children}</dd>
    </div>
  );
}

export default function GalleryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const gallery = useGallery(id);
  const update = useUpdateGallery(id);
  const remove = useDeleteGallery();

  if (gallery.isLoading) return <QueryLoading rows={4} />;
  if (gallery.isError || !gallery.data) {
    return (
      <QueryError
        title="Galeri tidak dapat dimuat"
        message={errorMessage(gallery.error)}
        retry={() => gallery.refetch()}
      />
    );
  }
  const data = gallery.data;
  const link = galleryLink(data);

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title={data.name}
        description={data.description || 'Galeri pilihan foto customer'}
        icon={Images}
        backHref="/admin/galleries"
        createAction={
          <div className="flex flex-wrap items-center gap-2">
            <CopyLinkButton link={link} />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              nativeButton={false}
              render={<Link href={`/admin/galleries/${id}/preview`} />}
            >
              <Eye className="size-3.5" />
              Pratinjau
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              nativeButton={false}
              render={<Link href={`/admin/galleries/${id}/edit`} />}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          </div>
        }
      />

      <Card className={CARD}>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Informasi</h2>
              <GalleryStatusBadge status={data.status} />
            </div>
            <div className="flex flex-wrap gap-2">
              {data.status !== 'ACTIVE' && (
                <Button
                  size="sm"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ status: 'ACTIVE' })}
                >
                  Aktifkan
                </Button>
              )}
              {data.status === 'ACTIVE' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ status: 'ARCHIVED' })}
                  className="gap-1.5"
                >
                  <Archive className="size-3.5" />
                  Arsipkan
                </Button>
              )}
              <CmsDeleteDialog
                title={data.name}
                entityLabel="galeri"
                description={
                  <>
                    Galeri{' '}
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      “{data.name}”
                    </span>{' '}
                    akan dihapus permanen, termasuk{' '}
                    {data.totalSelections > 0
                      ? `pilihan ${data.totalSelections} customer di dalamnya (${data.totalSubmissions} sudah dikirim)`
                      : 'semua pilihan customer di dalamnya'}
                    .{data.status === 'ACTIVE' && ' Tautan customer langsung berhenti bisa dibuka.'}{' '}
                    Foto di Google Drive tidak terpengaruh.
                  </>
                }
                isPending={remove.isPending}
                onConfirm={() =>
                  remove.mutate(id, { onSuccess: () => router.replace('/admin/galleries') })
                }
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-rose-600 hover:text-rose-700"
                  >
                    <Trash2 className="size-3.5" />
                    Hapus
                  </Button>
                }
              />
            </div>
          </div>
          {data.status === 'DRAFT' && (
            <p className="rounded-lg bg-zinc-100 p-3 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400">
              Galeri masih draft, jadi tautannya belum bisa dibuka customer. Klik Aktifkan setelah
              fotonya muncul.
            </p>
          )}
          <dl className="space-y-3">
            <Row label="Tautan customer">
              <a href={link} target="_blank" rel="noopener noreferrer" className="underline">
                {link}
              </a>
            </Row>
            <Row label="Folder Drive">
              <a
                href={`https://drive.google.com/drive/folders/${data.driveFolderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs underline"
              >
                {data.driveFolderId}
              </a>
            </Row>
            <Row label="Batas pilihan">
              {data.maxSelections ? `${data.maxSelections} foto` : 'Tidak dibatasi'}
            </Row>
            <Row label="Kuota customer">
              {data.maxCustomers ? (
                <span className="inline-flex items-center gap-2">
                  {Math.min(data.totalSelections, data.maxCustomers)} dari {data.maxCustomers}{' '}
                  customer
                  {data.totalSelections >= data.maxCustomers && (
                    <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-bold text-rose-600">
                      Penuh · customer lain hanya bisa melihat
                    </span>
                  )}
                </span>
              ) : (
                'Tidak dibatasi'
              )}
            </Row>
            {data.booking && (
              <Row label="Booking">
                {data.booking.bookingCode} · {data.booking.customerName}
              </Row>
            )}
            <Row label="Dibuat">{formatDateTime(data.createdAt)}</Row>
          </dl>
        </CardContent>
      </Card>

      <SyncStatusCard galleryId={id} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Foto aktif"
          value={data.totalActivePhotos}
          hint={
            data.totalPhotos > data.totalActivePhotos
              ? `${data.totalPhotos - data.totalActivePhotos} sudah dihapus dari Drive`
              : undefined
          }
        />
        <Stat
          label="Customer"
          value={data.totalSelections}
          hint={`${data.totalSubmissions} sudah mengirim pilihan`}
        />
        <Stat label="Total foto dipilih" value={data.totalSelectedPhotos} />
      </div>

      <SelectionsSection galleryId={id} />
    </div>
  );
}
