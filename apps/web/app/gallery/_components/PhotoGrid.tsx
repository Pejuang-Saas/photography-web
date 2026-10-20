'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import type { Photo } from '@/types/gallery';
import PhotoCard from './PhotoCard';

const NO_SELECTION = new Set<string>();
const noop = () => undefined;
const DEFAULT_COLUMNS =
  'grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';

/**
 * Draws the photos loaded so far and asks for the next page when the marker below the grid comes
 * near the screen: infinite scroll. The images themselves load lazily, as each card nears view.
 */
export default function PhotoGrid({
  photos,
  selectedIds = NO_SELECTION,
  disabled = false,
  lockUnselected = false,
  onToggle = noop,
  onPreview = noop,
  renderPhoto,
  columns = DEFAULT_COLUMNS,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  photos: Photo[];
  selectedIds?: Set<string>;
  /** Read-only, after submitting. */
  disabled?: boolean;
  /** At the limit: what is already chosen can still be removed. */
  lockUnselected?: boolean;
  onToggle?: (photoId: string) => void;
  onPreview?: (photoId: string) => void;
  /** Draws a card its own way, for a list that is not about choosing. */
  renderPhoto?: (photo: Photo) => ReactNode;
  columns?: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);

  // Watching again after each page: a marker that is still on screen asks for the next one.
  useEffect(() => {
    const marker = sentinel.current;
    if (!marker || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: '800px' },
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore, photos.length]);

  return (
    <>
      <div className={`grid ${columns}`}>
        {photos.map((photo) =>
          renderPhoto ? (
            renderPhoto(photo)
          ) : (
            <PhotoCard
              key={photo.id}
              photo={photo}
              isSelected={selectedIds.has(photo.id)}
              disabled={disabled}
              dimmed={lockUnselected}
              onToggle={onToggle}
              onPreview={onPreview}
            />
          ),
        )}
      </div>
      {hasMore && <div ref={sentinel} className="h-8" aria-hidden />}
      {loadingMore && (
        <p className="flex items-center justify-center gap-2 py-3 text-xs text-zinc-500">
          <Loader2 className="size-3.5 animate-spin" />
          Memuat foto lainnya…
        </p>
      )}
    </>
  );
}
