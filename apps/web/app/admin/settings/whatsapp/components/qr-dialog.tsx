'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { RefreshCw } from 'lucide-react';
import { errorMessage } from '@/lib/admin-queries';
import { useWhatsappQr } from '@/lib/whatsapp-queries';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SCAN_SECONDS = 45;

/** Counts down from the moment a QR image arrives; a new image restarts it. */
function useCountdown(resetKey: string | undefined) {
  const [state, setState] = useState({ key: resetKey, left: SCAN_SECONDS });

  useEffect(() => {
    const timer = setInterval(() => {
      setState((current) =>
        current.key === resetKey
          ? { ...current, left: Math.max(0, current.left - 1) }
          : { key: resetKey, left: SCAN_SECONDS },
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [resetKey]);

  return state.key === resetKey ? state.left : SCAN_SECONDS;
}

export default function QrDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qr = useWhatsappQr(open);
  const image = qr.data?.image;
  const left = useCountdown(image?.slice(-32));
  const expired = Boolean(image) && left === 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hubungkan WhatsApp studio</DialogTitle>
          <DialogDescription>
            Buka WhatsApp di ponsel studio, pilih Perangkat Tertaut, lalu Tautkan Perangkat dan
            pindai kode di bawah.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          <div className="relative flex size-64 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700">
            {image ? (
              <Image
                unoptimized
                src={image}
                alt="Kode QR untuk menautkan WhatsApp"
                width={256}
                height={256}
                className={expired ? 'opacity-20 blur-sm' : undefined}
              />
            ) : qr.isError ? (
              <p className="px-6 text-center text-xs text-rose-600">{errorMessage(qr.error)}</p>
            ) : (
              <p className="animate-pulse text-xs text-zinc-500">Menyiapkan kode QR…</p>
            )}
            {expired && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70">
                <p className="text-sm font-semibold text-zinc-800">Kode kedaluwarsa</p>
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-500" aria-live="polite">
            {expired
              ? 'Muat ulang untuk mendapatkan kode baru.'
              : image
                ? `Kode berlaku sekitar ${left} detik lagi.`
                : ' '}
          </p>

          <Button
            variant="outline"
            size="sm"
            disabled={qr.isFetching}
            onClick={() => qr.refetch()}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${qr.isFetching ? 'animate-spin' : ''}`} />
            Muat ulang QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
