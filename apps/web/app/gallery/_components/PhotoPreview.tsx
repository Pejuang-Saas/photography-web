'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Check, ChevronLeft, ChevronRight, ExternalLink, ImageOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Photo } from '@/types/gallery';
import { isVideo, videoPlayerUrl } from './media';

/** Drive serves the same thumbnail endpoint at any size; the grid asks for small, this for large. */
export const largeUrl = (photo: Photo) =>
  photo.thumbnailUrl?.replace(/sz=w\d+/, 'sz=w1600') ?? null;

const SWIPE_PX = 50;

/**
 * One photo at a time, large, with the same choice button the grid has. It steps through the list
 * that was on screen when it opened, so unselecting inside the Selected tab does not pull the
 * photo out from under the customer.
 */
export default function PhotoPreview({
  photos,
  index,
  selectedIds,
  disabled,
  hideSelect = false,
  onToggle,
  onNavigate,
  onClose,
  hasMore = false,
  onLoadMore,
  total,
  footer,
}: {
  photos: Photo[];
  /** Null when closed. */
  index: number | null;
  selectedIds: Set<string>;
  /** Read-only, after submitting. */
  disabled: boolean;
  /** For the admin, who only looks: no choice button. */
  hideSelect?: boolean;
  onToggle: (photoId: string) => void;
  onNavigate: (index: number) => void;
  onClose: () => void;
  /** More photos wait on the server: stepping past the last one loaded asks for them. */
  hasMore?: boolean;
  onLoadMore?: () => void;
  /** How many there are in all, when more than the loaded ones. */
  total?: number;
  /** Extra content under the photo's name, such as the customer's note or revision request. */
  footer?: (photo: Photo) => ReactNode;
}) {
  const open = index !== null && photos[index] !== undefined;
  const photo = open ? photos[index] : null;
  const [loaded, setLoaded] = useState<{ id: string; failed: boolean } | null>(null);
  const swipeStart = useRef<number | null>(null);

  const go = (step: number) => {
    if (index === null) return;
    if (step > 0 && index === photos.length - 1 && hasMore) {
      onLoadMore?.();
      return;
    }
    if (photos.length < 2) return;
    onNavigate((index + step + photos.length) % photos.length);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Close to the end of what is loaded, the next page is fetched before it is needed.
  useEffect(() => {
    if (index !== null && hasMore && index >= photos.length - 3) onLoadMore?.();
  }, [index, hasMore, photos.length, onLoadMore]);

  // The next and previous photo are fetched ahead so stepping through feels instant.
  useEffect(() => {
    if (index === null) return;
    for (const step of [1, -1]) {
      const neighbour = photos[(index + step + photos.length) % photos.length];
      const url = neighbour && largeUrl(neighbour);
      if (url) {
        const image = new window.Image();
        image.referrerPolicy = 'no-referrer';
        image.src = url;
      }
    }
  }, [index, photos]);

  const selected = photo ? selectedIds.has(photo.id) : false;
  const src = photo ? largeUrl(photo) : null;
  const state = loaded && photo && loaded.id === photo.id ? loaded : null;
  const video = photo ? isVideo(photo) : false;
  const extra = photo && footer ? footer(photo) : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="h-[92dvh] max-h-[92dvh] grid-rows-[minmax(0,1fr)_auto_auto] gap-0 overflow-hidden bg-black p-0 text-white ring-0 sm:max-w-5xl"
        aria-describedby={undefined}
      >
        {photo && (
          <>
            <DialogTitle className="sr-only">{photo.filename}</DialogTitle>
            <DialogDescription className="sr-only">
              {video ? 'Video' : 'Foto'} {(index ?? 0) + 1} dari {total ?? photos.length}
            </DialogDescription>

            <div
              className="relative min-h-0"
              onTouchStart={(event) => {
                swipeStart.current = event.touches[0].clientX;
              }}
              onTouchEnd={(event) => {
                if (swipeStart.current === null) return;
                const moved = event.changedTouches[0].clientX - swipeStart.current;
                swipeStart.current = null;
                if (Math.abs(moved) > SWIPE_PX) go(moved < 0 ? 1 : -1);
              }}
            >
              {photo && video ? (
                <iframe
                  key={photo.id}
                  src={videoPlayerUrl(photo)}
                  title={photo.filename}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  className="size-full border-0"
                />
              ) : src && !state?.failed ? (
                <Image
                  key={photo.id}
                  src={src}
                  alt={photo.filename}
                  fill
                  sizes="(min-width: 1024px) 1024px, 100vw"
                  unoptimized
                  priority
                  referrerPolicy="no-referrer"
                  onLoad={() => setLoaded({ id: photo.id, failed: false })}
                  onError={() => setLoaded({ id: photo.id, failed: true })}
                  className="object-contain"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 text-zinc-400">
                  <ImageOff className="size-10" />
                  <p className="text-sm">Foto tidak dapat dimuat</p>
                </div>
              )}
              {src && !video && !state && (
                <Loader2 className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-zinc-400" />
              )}

              {(photos.length > 1 || hasMore) && (
                <>
                  <button
                    type="button"
                    aria-label="Foto sebelumnya"
                    onClick={() => go(-1)}
                    className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/75"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Foto berikutnya"
                    onClick={() => go(1)}
                    className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/75"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-zinc-950 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{photo.filename}</p>
                <p className="text-xs text-zinc-400">
                  {(index ?? 0) + 1} / {total ?? photos.length}
                  {photo.viewUrl && (
                    <>
                      {' · '}
                      <a
                        href={photo.viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-white"
                      >
                        Buka ukuran penuh
                        <ExternalLink className="size-3" />
                      </a>
                    </>
                  )}
                </p>
              </div>
              {!hideSelect && (
                <Button
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => onToggle(photo.id)}
                  className={cn(
                    'gap-2 font-bold',
                    selected
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-amber-500 text-zinc-950 hover:bg-amber-600',
                  )}
                >
                  {selected && <Check className="size-4" strokeWidth={3} />}
                  {selected ? 'Dipilih' : video ? 'Pilih video ini' : 'Pilih foto ini'}
                </Button>
              )}
            </div>
            {extra && <div className="border-t border-white/10 bg-zinc-950 px-4 py-3">{extra}</div>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
