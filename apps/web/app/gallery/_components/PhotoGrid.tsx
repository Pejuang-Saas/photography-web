'use client';

import { useEffect, useRef, useState } from 'react';
import type { Photo } from '@/types/gallery';
import PhotoCard from './PhotoCard';

const STEP = 50;

/**
 * Draws the photos 50 at a time: the rest are already in memory, and the next 50 appear when the
 * marker below the grid comes into view. Starts over from the top when the list is a new one.
 */
export default function PhotoGrid({
  photos,
  selectedIds,
  disabled,
  lockUnselected,
  onToggle,
  resetKey,
}: {
  photos: Photo[];
  selectedIds: Set<string>;
  /** Read-only, after submitting. */
  disabled: boolean;
  /** At the limit: what is already chosen can still be removed. */
  lockUnselected: boolean;
  onToggle: (photoId: string) => void;
  resetKey: string;
}) {
  const [visible, setVisible] = useState({ key: resetKey, count: STEP });
  const count = visible.key === resetKey ? visible.count : STEP;
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marker = sentinel.current;
    if (!marker || count >= photos.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible({ key: resetKey, count: count + STEP });
        }
      },
      { rootMargin: '600px' },
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, [count, photos.length, resetKey]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {photos.slice(0, count).map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            isSelected={selectedIds.has(photo.id)}
            disabled={disabled}
            dimmed={lockUnselected}
            onToggle={onToggle}
          />
        ))}
      </div>
      {count < photos.length && <div ref={sentinel} className="h-8" aria-hidden />}
    </>
  );
}
