'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { Check, Expand, ImageOff, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Photo } from '@/types/gallery';
import { isVideo } from './media';

function PhotoCardView({
  photo,
  isSelected,
  disabled,
  dimmed,
  onToggle,
  onPreview,
}: {
  photo: Photo;
  isSelected: boolean;
  /** Read-only, after submitting. */
  disabled: boolean;
  /** The limit is reached: still clickable, so the customer is told why nothing happens. */
  dimmed: boolean;
  onToggle: (photoId: string) => void;
  onPreview: (photoId: string) => void;
}) {
  // A thumbnail link can expire or be refused; a placeholder beats a broken image.
  const [failed, setFailed] = useState(false);
  const video = isVideo(photo);

  return (
    <div
      className={cn(
        'group relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800',
        isSelected && 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background',
        dimmed && !isSelected && 'opacity-50',
      )}
    >
      <button
        type="button"
        aria-pressed={isSelected}
        aria-label={`${isSelected ? 'Batalkan pilihan' : 'Pilih'} ${video ? 'video' : 'foto'} ${photo.filename}`}
        disabled={disabled}
        onClick={() => onToggle(photo.id)}
        className="absolute inset-0 block size-full cursor-pointer disabled:cursor-default"
      >
        {photo.thumbnailUrl && !failed ? (
          <Image
            src={photo.thumbnailUrl}
            alt={photo.filename}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 50vw"
            loading="lazy"
            unoptimized
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-2 p-3 text-center text-zinc-400">
            <ImageOff className="size-7" />
            <span className="line-clamp-2 text-[11px] break-all">{photo.filename}</span>
          </span>
        )}
        {video && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
              <Play className="size-5 fill-current" />
            </span>
          </span>
        )}
        {isSelected && (
          <span className="absolute inset-0 flex items-start justify-end bg-amber-500/15 p-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-amber-500 text-zinc-950 shadow">
              <Check className="size-4" strokeWidth={3} />
            </span>
          </span>
        )}
      </button>

      {/* Always visible: a touch screen has no hover. */}
      <button
        type="button"
        aria-label={`Perbesar ${photo.filename}`}
        onClick={() => onPreview(photo.id)}
        className="absolute left-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
      >
        <Expand className="size-4" />
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <span className="block truncate text-[11px] font-medium text-white">{photo.filename}</span>
      </div>
    </div>
  );
}

/** Re-renders only when its own photo, selection or lock changes, which matters at 1000 photos. */
export default memo(PhotoCardView);
