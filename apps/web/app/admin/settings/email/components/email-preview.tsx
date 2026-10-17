'use client';

import { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

type Device = 'desktop' | 'mobile';

const DEVICES: Array<{ id: Device; label: string; icon: typeof Monitor }> = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
];

/**
 * Shows an email exactly as rendered by the server, inside a sandboxed frame: the frame is as wide
 * as the device, so the email's own responsive rules kick in just like in a real inbox.
 */
export default function EmailPreview({
  subject,
  html,
  notice,
  loading,
  height = 620,
}: {
  subject?: string;
  html: string | null;
  /** Why there is nothing (or something stale) to show, for example a validation problem. */
  notice?: string | null;
  loading?: boolean;
  height?: number;
}) {
  const [device, setDevice] = useState<Device>('desktop');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Subjek</p>
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
            {subject || '—'}
          </p>
        </div>
        <div
          role="group"
          aria-label="Ukuran tampilan"
          className="flex shrink-0 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          {DEVICES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={device === id}
              onClick={() => setDevice(id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                device === id
                  ? 'bg-white text-amber-600 shadow-sm dark:bg-zinc-800 dark:text-amber-400'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white',
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          {notice}
        </p>
      )}

      <div
        className={cn(
          'flex justify-center rounded-xl border border-zinc-200 bg-zinc-100 p-3 transition-opacity dark:border-zinc-800 dark:bg-zinc-950',
          loading && 'opacity-70',
        )}
      >
        {html ? (
          <iframe
            title="Pratinjau email"
            sandbox=""
            srcDoc={html}
            style={{ height }}
            className={cn(
              'max-w-full rounded-lg border-0 bg-white shadow-sm',
              device === 'mobile' ? 'w-[375px]' : 'w-full',
            )}
          />
        ) : (
          <div
            style={{ height: Math.min(height, 240) }}
            className="flex w-full items-center justify-center text-xs text-zinc-500"
          >
            Pratinjau akan muncul di sini
          </div>
        )}
      </div>
    </div>
  );
}
