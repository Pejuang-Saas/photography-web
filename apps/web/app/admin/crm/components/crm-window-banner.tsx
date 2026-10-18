'use client';

import { Lock, ShieldCheck } from 'lucide-react';
import type { CrmWindow } from '@/lib/crm-api';
import { formatRemaining } from '@/lib/crm-format';
import { useDeadline } from '@/lib/use-deadline';

/**
 * Shows whether the studio may still answer freely. The countdown starts from the server's
 * "seconds remaining" at the time the data arrived, so a wrong clock on this device cannot
 * keep a closed window looking open.
 */
export default function CrmWindowBanner({
  window,
  receivedAt,
}: {
  window: CrmWindow;
  /** When the data was fetched (react-query's dataUpdatedAt). */
  receivedAt: number;
}) {
  const msLeft = useDeadline(window.open ? receivedAt + window.remainingSeconds * 1000 : null);
  const open = window.open && (msLeft ?? 0) > 0;

  if (open) {
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 border-t border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300"
      >
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <p>
          <span className="font-semibold">Jendela percakapan aktif.</span> Sisa waktu interaksi{' '}
          <span className="font-mono font-semibold">
            {formatRemaining(Math.floor((msLeft ?? 0) / 1000))}
          </span>
          . Anda bebas mengirim pesan teks biasa.
        </p>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-start gap-2.5 border-t border-rose-500/25 bg-rose-500/[0.07] px-4 py-3 text-xs text-rose-800 dark:text-rose-300"
    >
      <Lock className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-semibold">
          {window.expiresAt
            ? 'Jendela percakapan 24 jam telah berakhir.'
            : 'Customer belum pernah membalas.'}
        </span>{' '}
        Untuk mencegah nomor dilaporkan sebagai spam dan diblokir WhatsApp, pengetikan pesan bebas
        dikunci sementara.
      </p>
    </div>
  );
}
