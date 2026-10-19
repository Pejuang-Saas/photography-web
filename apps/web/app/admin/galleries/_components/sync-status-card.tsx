'use client';

import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import { errorMessage } from '@/lib/admin-queries';
import { useLatestSync, useTriggerSync } from '@/lib/gallery-queries';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { SyncJob } from '@/types/gallery';

const CARD =
  'rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60';

export const isSyncing = (job: SyncJob | null | undefined) =>
  job?.status === 'PENDING' || job?.status === 'RUNNING';

function Progress({ job }: { job: SyncJob }) {
  const total = job.totalFiles;
  return (
    <div className="space-y-2">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={job.percentComplete}
        aria-label="Kemajuan sinkronisasi"
        className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div
          className="h-full bg-amber-500 transition-all"
          style={{ width: `${job.percentComplete}%` }}
        />
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {total === null
          ? 'Membaca folder Google Drive…'
          : `Menyinkronkan… ${job.syncedFiles} / ${total} file (${job.percentComplete}%)`}
      </p>
    </div>
  );
}

/** Where the last sync stands, and the button to run another; keeps itself current while one runs. */
export default function SyncStatusCard({ galleryId }: { galleryId: string }) {
  const latest = useLatestSync(galleryId);
  const trigger = useTriggerSync();
  const job = latest.data;
  const running = isSyncing(job) || trigger.isPending;

  // Tell the admin once when a run that was going finishes.
  const wasRunning = useRef(false);
  useEffect(() => {
    if (isSyncing(job)) wasRunning.current = true;
    else if (wasRunning.current && job) {
      wasRunning.current = false;
      if (job.status === 'COMPLETED') toast.success(`Sync selesai: ${job.newFiles} foto baru`);
      if (job.status === 'FAILED') toast.error('Sync gagal. Lihat detail di kartu sinkronisasi.');
    }
  }, [job]);

  return (
    <Card className={CARD}>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Sinkronisasi Drive</h2>
            <p className="text-xs text-zinc-500">
              Membaca foto terbaru dari folder Google Drive. Foto sendiri tidak disalin ke server.
            </p>
          </div>
          <Button
            size="sm"
            disabled={running}
            onClick={() => trigger.mutate(galleryId)}
            className="gap-1.5 bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600"
          >
            <RefreshCw className={`size-3.5 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Menyinkronkan…' : 'Sync Drive'}
          </Button>
        </div>

        {latest.isError && (
          <p role="alert" className="text-xs text-rose-600">
            {errorMessage(latest.error)}
          </p>
        )}

        {!latest.isLoading && !job && (
          <p className="text-sm text-zinc-500">Belum pernah disinkronkan.</p>
        )}

        {job && isSyncing(job) && <Progress job={job} />}

        {job?.status === 'COMPLETED' && (
          <p className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <span>
              {job.completedAt && formatDateTime(job.completedAt)} — {job.totalFiles ?? 0} foto (
              {job.newFiles} baru, {job.removedFiles} dihapus)
            </span>
          </p>
        )}

        {job?.status === 'FAILED' && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/[0.06] p-3 text-sm text-rose-700 dark:text-rose-300"
          >
            <XCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Sinkronisasi gagal</p>
              <p className="mt-0.5 text-xs">{job.errorMessage}</p>
            </div>
          </div>
        )}

        {job?.warningMessage && !isSyncing(job) && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/[0.08] p-3 text-xs text-amber-900 dark:text-amber-300"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>{job.warningMessage}</p>
          </div>
        )}

        {trigger.isPending && !job && (
          <p className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="size-3.5 animate-spin" />
            Memulai…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
