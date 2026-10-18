'use client';

import { useState } from 'react';
import { Download, FileText, ImageOff, RefreshCw } from 'lucide-react';
import { crmMediaUrl, type CrmMessage } from '@/lib/crm-api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

const baseMime = (mime: string | null | undefined) =>
  (mime ?? '').split(';')[0].trim().toLowerCase();

/**
 * An attachment inside a chat bubble: photos and stickers open in a viewer, video and voice notes
 * play in place, and anything else is a file to download. The file is fetched with the admin's
 * session, from private storage; nothing here is public.
 */
export default function CrmMessageMedia({ message }: { message: CrmMessage }) {
  const [attempt, setAttempt] = useState(0);
  // null while the file loads fine; `gone` means WhatsApp itself no longer has it, so retrying is pointless.
  const [failure, setFailure] = useState<{ gone: boolean } | null>(null);
  const [viewing, setViewing] = useState(false);

  const mime = baseMime(message.media?.mime);
  const filename = message.media?.filename ?? 'lampiran';
  // A new query string makes the browser ask again after a failure.
  const url = `${crmMediaUrl(message.id)}${attempt ? `?retry=${attempt}` : ''}`;

  // An <img> cannot tell why it failed, so ask the same address once more to read the reason.
  async function handleError() {
    try {
      const response = await fetch(url, { credentials: 'include' });
      setFailure({ gone: response.status === 410 });
    } catch {
      setFailure({ gone: false });
    }
  }

  if (failure) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-white/60 p-3 text-xs text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-400">
        <ImageOff className="size-5 shrink-0" />
        <span className="min-w-0 flex-1">
          {failure.gone
            ? 'Lampiran sudah tidak tersedia di WhatsApp (kedaluwarsa).'
            : 'Lampiran tidak dapat dimuat.'}
        </span>
        {!failure.gone && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => {
              setFailure(null);
              setAttempt((current) => current + 1);
            }}
          >
            <RefreshCw className="size-3" />
            Coba lagi
          </Button>
        )}
      </div>
    );
  }

  if (mime.startsWith('image/')) {
    const sticker = mime === 'image/webp' && !message.body;
    return (
      <>
        <button
          type="button"
          onClick={() => setViewing(true)}
          aria-label="Lihat gambar"
          className="block overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- private, session-authenticated file */}
          <img
            src={url}
            alt="Lampiran gambar"
            loading="lazy"
            onError={handleError}
            className={sticker ? 'max-h-40 w-auto' : 'max-h-72 w-auto max-w-full object-cover'}
          />
        </button>
        <Dialog open={viewing} onOpenChange={setViewing}>
          <DialogContent className="max-w-[calc(100%-2rem)] gap-3 sm:max-w-3xl">
            <DialogTitle className="truncate text-sm">{filename}</DialogTitle>
            <DialogDescription className="sr-only">Pratinjau gambar lampiran</DialogDescription>
            {/* eslint-disable-next-line @next/next/no-img-element -- private, session-authenticated file */}
            <img
              src={url}
              alt="Lampiran gambar"
              className="mx-auto max-h-[75vh] w-auto max-w-full rounded-lg"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-fit gap-1.5"
              nativeButton={false}
              render={<a href={url} download={filename} />}
            >
              <Download className="size-3.5" />
              Unduh
            </Button>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (mime.startsWith('video/')) {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        onError={handleError}
        className="max-h-72 w-full max-w-sm rounded-lg bg-black"
      />
    );
  }

  if (mime.startsWith('audio/')) {
    return (
      <audio
        src={url}
        controls
        preload="none"
        onError={handleError}
        className="h-10 w-64 max-w-full"
      />
    );
  }

  return (
    <a
      href={url}
      download={filename}
      className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white/70 p-3 text-xs transition-colors hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:bg-zinc-900"
    >
      <FileText className="size-5 shrink-0 text-zinc-500" />
      <span className="min-w-0 flex-1 truncate font-medium text-zinc-800 dark:text-zinc-200">
        {filename}
      </span>
      <Download className="size-4 shrink-0 text-zinc-500" />
    </a>
  );
}
