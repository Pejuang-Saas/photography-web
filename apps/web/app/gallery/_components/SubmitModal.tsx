'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Photo } from '@/types/gallery';

export default function SubmitModal({
  isOpen,
  onClose,
  onSubmit,
  selectedPhotos,
  selectedCount,
  pending,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  /** The ones loaded so far, in gallery order; the first five are shown. */
  selectedPhotos: Photo[];
  selectedCount: number;
  pending: boolean;
  error: string | null;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Anda memilih {selectedCount} foto</DialogTitle>
          <DialogDescription>
            Setelah dikirim, pilihan tidak bisa diubah lagi. Pastikan semuanya sudah benar.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 overflow-hidden">
          {selectedPhotos.slice(0, 5).map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-[4/5] w-1/5 overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800"
            >
              {photo.thumbnailUrl && (
                <Image
                  src={photo.thumbnailUrl}
                  alt={photo.filename}
                  fill
                  sizes="96px"
                  unoptimized
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              )}
            </div>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-xs text-rose-600">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose}>
            Kembali
          </Button>
          <Button
            disabled={pending}
            onClick={onSubmit}
            className="bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600"
          >
            {pending ? 'Mengirim…' : 'Konfirmasi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
