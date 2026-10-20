'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Eye, ImageOff, Loader2 } from 'lucide-react';
import FolderGrid, { FolderBreadcrumb } from '@/app/gallery/_components/FolderGrid';
import PhotoGrid from '@/app/gallery/_components/PhotoGrid';
import PhotoPreview from '@/app/gallery/_components/PhotoPreview';
import TypeFilter from '@/app/gallery/_components/TypeFilter';
import { useFolderTrail } from '@/app/gallery/_components/use-folder-trail';
import { errorMessage } from '@/lib/admin-queries';
import { galleryApi } from '@/lib/gallery-api';
import { galleryKeys, useGallery } from '@/lib/gallery-queries';
import { usePhotoPages } from '@/lib/use-photo-pages';
import type { MediaType } from '@/types/gallery';
import { CmsPageHeader } from '../../../components/cms-page-header';
import { QueryError, QueryLoading } from '../../../components/query-state';

const NO_SELECTION = new Set<string>();

/**
 * The gallery as a customer sees it, for the admin: no name to enter, no session, nothing saved.
 * It reads through the admin API, so a draft or archived gallery can be checked before it is shared.
 * Photos come a page at a time as the page is scrolled, like the customer's.
 */
export default function GalleryPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const gallery = useGallery(id);
  const trail = useFolderTrail();
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const pages = usePhotoPages({
    queryKey: [...galleryKeys.photos(id), mediaType, trail.path],
    fetchPage: (page) =>
      galleryApi.photos(id, { page, isActive: true, folder: trail.path, type: mediaType }),
  });
  const [previewId, setPreviewId] = useState<string | null>(null);

  if (gallery.isLoading) return <QueryLoading rows={4} />;
  if (gallery.isError || !gallery.data) {
    return (
      <QueryError
        title="Pratinjau tidak dapat dimuat"
        message={errorMessage(gallery.error)}
        retry={() => void gallery.refetch()}
      />
    );
  }
  const data = gallery.data;
  const shown = pages.photos;
  const previewIndex = previewId ? shown.findIndex((photo) => photo.id === previewId) : -1;
  const browsing = trail.trail.length > 0 || pages.folders.length > 0;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Pratinjau Galeri"
        description="Tampilan yang dilihat customer. Tidak perlu mengisi data, dan tidak ada pilihan yang disimpan."
        icon={Eye}
        backHref={`/admin/galleries/${id}`}
      />

      {data.status !== 'ACTIVE' && (
        <p
          role="status"
          className="rounded-lg border border-amber-500/40 bg-amber-500/[0.08] p-3 text-xs text-amber-900 dark:text-amber-300"
        >
          {data.status === 'DRAFT'
            ? 'Galeri masih draft: customer belum bisa membuka tautannya. Aktifkan setelah fotonya sesuai.'
            : 'Galeri ini diarsipkan: customer tidak bisa membuka tautannya lagi.'}
        </p>
      )}

      <header className="space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          {data.name}
        </h2>
        {data.description && <p className="max-w-2xl text-sm text-zinc-500">{data.description}</p>}
        <p className="text-sm text-zinc-500">
          {data.totalActivePhotos} Foto
          {data.maxSelections ? ` · customer boleh memilih maksimal ${data.maxSelections}` : ''}
        </p>
      </header>

      <TypeFilter
        value={mediaType}
        onChange={setMediaType}
        totalPhotos={data.totalActivePhotos}
        totalVideos={data.totalActiveVideos}
      />

      <div className="space-y-4">
        {browsing && <FolderBreadcrumb path={trail.path} onOpen={trail.goTo} />}
        <FolderGrid folders={pages.folders} onOpen={trail.open} />
        {shown.length > 0 ? (
          <PhotoGrid
            photos={shown}
            selectedIds={NO_SELECTION}
            disabled={false}
            lockUnselected={false}
            // Here a click only opens the photo larger; nothing can be chosen.
            onToggle={setPreviewId}
            onPreview={setPreviewId}
            hasMore={!!pages.hasMore}
            loadingMore={pages.loadingMore}
            onLoadMore={pages.loadMore}
          />
        ) : pages.isLoading ? (
          <p className="flex items-center justify-center gap-2 py-20 text-sm text-zinc-500">
            <Loader2 className="size-4 animate-spin" />
            Memuat foto…
          </p>
        ) : pages.isError ? (
          <QueryError
            title="Foto tidak dapat dimuat"
            message={errorMessage(pages.error)}
            retry={() => void pages.refetch()}
          />
        ) : pages.folders.length > 0 ? null : (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-zinc-500">
            <ImageOff className="size-8" />
            <p className="text-sm">
              {data.totalActivePhotos === 0
                ? 'Belum ada foto. Jalankan Sync Drive di halaman detail.'
                : mediaType !== 'all'
                  ? `Tidak ada ${mediaType === 'video' ? 'video' : 'foto'} di sini.`
                  : 'Folder ini kosong.'}
            </p>
          </div>
        )}
      </div>

      <PhotoPreview
        photos={shown}
        index={previewIndex >= 0 ? previewIndex : null}
        selectedIds={NO_SELECTION}
        disabled
        hideSelect
        onToggle={setPreviewId}
        onNavigate={(index) => setPreviewId(shown[index]?.id ?? null)}
        onClose={() => setPreviewId(null)}
        hasMore={!!pages.hasMore}
        onLoadMore={pages.loadMore}
        total={pages.total}
      />
    </div>
  );
}
