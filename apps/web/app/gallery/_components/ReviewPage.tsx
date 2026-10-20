'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  ImageOff,
  Loader2,
  Play,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/admin-queries';
import { publicGalleryApi } from '@/lib/gallery-api';
import { usePhotoPages } from '@/lib/use-photo-pages';
import { cn } from '@/lib/utils';
import type { Photo } from '@/types/gallery';
import { isVideo } from './media';
import PhotoGrid from './PhotoGrid';

function ReviewCard({ photo, onRemove }: { photo: Photo; onRemove: (photoId: string) => void }) {
  const [failed, setFailed] = useState(false);
  const video = isVideo(photo);

  return (
    <div className="space-y-1.5">
      <div className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800">
        {photo.thumbnailUrl && !failed ? (
          <Image
            src={photo.thumbnailUrl}
            alt={photo.filename}
            fill
            sizes="(min-width: 1280px) 16vw, (min-width: 640px) 25vw, 33vw"
            loading="lazy"
            unoptimized
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-zinc-400">
            <ImageOff className="size-6" />
          </span>
        )}
        {video && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-black/55 text-white">
              <Play className="size-4 fill-current" />
            </span>
          </span>
        )}
        <button
          type="button"
          aria-label={`Hapus ${photo.filename} dari pilihan`}
          onClick={() => onRemove(photo.id)}
          className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-rose-600"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <p className="truncate text-[11px] text-zinc-500">{photo.filename}</p>
    </div>
  );
}

/**
 * The last look before sending, like a checkout: every photo that was picked, each removable, and
 * a summary with the send button beside it. Nothing is sent until the customer confirms.
 */
export default function ReviewPage({
  token,
  sessionToken,
  galleryName,
  customerName,
  max,
  selectedIds,
  onRemove,
  onBack,
  onSubmit,
  pending,
  error,
}: {
  token: string;
  sessionToken: string;
  galleryName: string;
  customerName: string;
  max: number | null;
  selectedIds: Set<string>;
  onRemove: (photoId: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [agreed, setAgreed] = useState(false);
  const pages = usePhotoPages({
    queryKey: ['gallery-review', token, sessionToken],
    fetchPage: (page) =>
      publicGalleryApi.photos(token, { page, filter: 'selected', sessionToken, limit: 48 }),
  });
  // Removing a photo here takes it off the list at once; the server list only ever shrinks.
  const picked = pages.photos.filter((photo) => selectedIds.has(photo.id));
  const count = selectedIds.size;
  const videos = picked.filter(isVideo).length;

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-zinc-900 antialiased dark:bg-[#0f141d] dark:text-zinc-100">
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            disabled={pending}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" />
            Kembali ke galeri
          </Button>
          <ThemeToggle />
        </div>

        <header className="mt-6">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Tinjau Pilihan</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Periksa foto yang Anda pilih. Hapus yang tidak jadi, lalu kirim ke studio.
          </p>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <section aria-label="Foto yang dipilih" className="space-y-4">
            {pages.isLoading ? (
              <p className="flex items-center justify-center gap-2 py-20 text-sm text-zinc-500">
                <Loader2 className="size-4 animate-spin" />
                Memuat pilihan…
              </p>
            ) : pages.isError ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center text-zinc-500">
                <TriangleAlert className="size-8 text-amber-500" />
                <p className="text-sm">Pilihan tidak dapat dimuat: {errorMessage(pages.error)}</p>
                <Button variant="outline" onClick={() => void pages.refetch()}>
                  Coba lagi
                </Button>
              </div>
            ) : count === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-20 text-center text-zinc-500 dark:border-zinc-700">
                <ImageOff className="size-8" />
                <p className="text-sm">Belum ada foto yang dipilih.</p>
                <Button variant="outline" onClick={onBack}>
                  Kembali ke galeri
                </Button>
              </div>
            ) : (
              <ReviewGrid
                photos={picked}
                hasMore={!!pages.hasMore}
                loadingMore={pages.loadingMore}
                onLoadMore={pages.loadMore}
                onRemove={onRemove}
              />
            )}
          </section>

          <aside className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 lg:sticky lg:top-6">
            <h2 className="text-base font-bold">Ringkasan</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Galeri</dt>
                <dd className="text-right font-medium">{galleryName}</dd>
              </div>
              {customerName && (
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Atas nama</dt>
                  <dd className="text-right font-medium">{customerName}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Dipilih</dt>
                <dd className="text-right font-bold text-amber-600 dark:text-amber-400">
                  {count}
                  {max !== null && (
                    <span className="font-normal text-zinc-500"> dari maks. {max}</span>
                  )}
                </dd>
              </div>
              {videos > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Terdiri dari</dt>
                  <dd className="text-right font-medium">
                    {picked.length - videos} foto, {videos} video
                  </dd>
                </div>
              )}
            </dl>

            <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-lg bg-amber-500/[0.08] p-3 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={agreed}
                disabled={pending}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-amber-500"
              />
              <span>
                Saya sudah memeriksa pilihan ini dan mengerti bahwa setelah dikirim, pilihan
                <strong> tidak bisa diubah lagi</strong>.
              </span>
            </label>

            {error && (
              <p role="alert" className="mt-3 text-xs text-rose-600">
                {error}
              </p>
            )}

            <Button
              disabled={!agreed || count === 0 || pending}
              onClick={onSubmit}
              className={cn(
                'mt-4 h-11 w-full gap-2 bg-amber-500 text-sm font-bold text-zinc-950 hover:bg-amber-600',
              )}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              {pending ? 'Mengirim…' : `Kirim ${count} Pilihan`}
            </Button>
            <Button variant="ghost" disabled={pending} onClick={onBack} className="mt-2 w-full">
              Ubah pilihan
            </Button>
          </aside>
        </div>
      </main>
    </div>
  );
}

/** Same infinite scroll as the gallery, with a remove button on each card. */
function ReviewGrid({
  photos,
  hasMore,
  loadingMore,
  onLoadMore,
  onRemove,
}: {
  photos: Photo[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRemove: (photoId: string) => void;
}) {
  return (
    <PhotoGrid
      photos={photos}
      hasMore={hasMore}
      loadingMore={loadingMore}
      onLoadMore={onLoadMore}
      renderPhoto={(photo) => <ReviewCard key={photo.id} photo={photo} onRemove={onRemove} />}
      columns="grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
    />
  );
}
