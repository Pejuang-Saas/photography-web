'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { errorMessage } from '@/lib/admin-queries';
import type { EmailLogItem, EmailLogStatus } from '@/lib/email-api';
import { useEmailLog, useEmailLogs, useResendEmail } from '@/lib/email-queries';
import { formatDateTime } from '@/lib/format';
import { useDebounced } from '@/lib/use-debounced';
import { cn } from '@/lib/utils';
import { QueryError, QueryLoading } from '../../../components/query-state';
import EmailPreview from './email-preview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const STATUS: Record<EmailLogStatus, { label: string; className: string }> = {
  SENT: {
    label: 'Terkirim',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  FAILED: {
    label: 'Gagal',
    className: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  },
  QUEUED: {
    label: 'Antrean',
    className: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
  },
  SKIPPED: {
    label: 'Dilewati',
    className: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  },
};

const HEAD = 'h-12 text-[11px] font-semibold uppercase tracking-wide text-zinc-500';

const FILTERS: Array<{ value: EmailLogStatus | undefined; label: string }> = [
  { value: undefined, label: 'Semua' },
  { value: 'SENT', label: 'Terkirim' },
  { value: 'FAILED', label: 'Gagal' },
  { value: 'SKIPPED', label: 'Dilewati' },
  { value: 'QUEUED', label: 'Antrean' },
];

function StatusBadge({ status }: { status: EmailLogStatus }) {
  const { label, className } = STATUS[status];
  return (
    <Badge variant="outline" className={cn('text-[10px] font-semibold', className)}>
      {label}
    </Badge>
  );
}

function LogDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const log = useEmailLog(id);
  const resend = useResendEmail();
  const data = log.data;

  return (
    <Dialog open={Boolean(id)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-3xl overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detail email</DialogTitle>
          <DialogDescription>Isi email persis seperti yang diterima customer.</DialogDescription>
        </DialogHeader>

        {log.isLoading && <QueryLoading rows={3} />}
        {log.isError && <p className="text-sm text-rose-600">{errorMessage(log.error)}</p>}
        {data && (
          <div className="space-y-4">
            <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Tujuan</dt>
                <dd className="mt-0.5 break-all font-medium">{data.to}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Status</dt>
                <dd className="mt-0.5 flex items-center gap-2">
                  <StatusBadge status={data.status} />
                  <span className="text-zinc-500">
                    {data.attempts > 0 ? `${data.attempts}× percobaan` : 'Belum dicoba'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Dibuat</dt>
                <dd className="mt-0.5 font-medium">{formatDateTime(data.createdAt)} WIB</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Terkirim</dt>
                <dd className="mt-0.5 font-medium">
                  {data.sentAt ? `${formatDateTime(data.sentAt)} WIB` : '—'}
                </dd>
              </div>
            </dl>

            {data.error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/[0.05] p-3 text-xs">
                <p className="font-semibold text-rose-700 dark:text-rose-300">
                  {data.status === 'SKIPPED' ? 'Alasan dilewati' : 'Pesan error'}
                </p>
                <p className="mt-1 break-words font-mono text-zinc-700 dark:text-zinc-300">
                  {data.error}
                </p>
              </div>
            )}

            {data.status === 'FAILED' && (
              <Button
                disabled={resend.isPending}
                onClick={() => resend.mutate(data.id)}
                className="gap-1.5 bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600"
              >
                <RefreshCw className={cn('size-3.5', resend.isPending && 'animate-spin')} />
                Kirim ulang
              </Button>
            )}

            {data.html ? (
              <EmailPreview subject={data.subject} html={data.html} height={520} />
            ) : (
              <div>
                <p className="mb-1.5 text-sm font-semibold">{data.subject}</p>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
                  {data.text}
                </pre>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LogRow({ log, onOpen }: { log: EmailLogItem; onOpen: () => void }) {
  return (
    <TableRow className="cursor-pointer [&>td]:py-4" onClick={onOpen}>
      <TableCell className="hidden whitespace-nowrap text-xs text-zinc-500 sm:table-cell">
        {formatDateTime(log.createdAt)}
      </TableCell>
      <TableCell className="max-w-[11rem] sm:max-w-[16rem]">
        <button
          type="button"
          className="block max-w-full truncate text-left text-sm font-medium hover:text-amber-600"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          {log.subject}
        </button>
        <p className="truncate text-xs text-zinc-500">{log.to}</p>
        <p className="text-[11px] text-zinc-500 sm:hidden">{formatDateTime(log.createdAt)}</p>
        {log.error && (
          <p className="mt-0.5 truncate text-[11px] text-rose-600 dark:text-rose-400">
            {log.error}
          </p>
        )}
      </TableCell>
      <TableCell className="hidden font-mono text-[11px] text-zinc-500 md:table-cell">
        {log.templateCode ?? '—'}
      </TableCell>
      <TableCell>
        <StatusBadge status={log.status} />
      </TableCell>
    </TableRow>
  );
}

export default function EmailHistoryTab() {
  const [status, setStatus] = useState<EmailLogStatus | undefined>(undefined);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const search = useDebounced(searchInput.trim());

  const logs = useEmailLogs({ status, search: search || undefined, page });
  const data = logs.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function changeStatus(next: EmailLogStatus | undefined) {
    setStatus(next);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex flex-wrap gap-1 rounded-xl border border-zinc-300 bg-zinc-200/70 p-1 dark:border-zinc-700 dark:bg-zinc-900"
          role="group"
          aria-label="Filter status"
        >
          {FILTERS.map(({ value, label }) => {
            const count = value
              ? data?.counts[value]
              : data && Object.values(data.counts).reduce((a, b) => a + b, 0);
            const active = status === value;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                onClick={() => changeStatus(value)}
                className={cn(
                  'rounded-lg px-4 py-2 text-xs font-semibold transition-colors',
                  active
                    ? 'bg-white text-amber-700 shadow-sm ring-1 ring-amber-500/50 dark:bg-zinc-800 dark:text-amber-300'
                    : 'text-zinc-600 hover:bg-white/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-white',
                )}
              >
                {label}
                {count !== undefined && (
                  <span className="ml-1.5 font-mono text-[11px] opacity-70">{count}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-zinc-400" />
          <Input
            aria-label="Cari email"
            placeholder="Cari tujuan atau subjek"
            className="h-11 border-zinc-300 bg-white pl-9 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {logs.isLoading && <QueryLoading rows={5} />}
      {logs.isError && !data && (
        <QueryError
          title="Riwayat tidak dapat dimuat"
          message={errorMessage(logs.error)}
          retry={() => logs.refetch()}
        />
      )}
      {data && (
        <Card className="overflow-hidden rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
          {data.items.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm text-zinc-500">
              {status || search
                ? 'Tidak ada email yang cocok dengan filter ini.'
                : 'Belum ada email yang dikirim.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={`${HEAD} hidden sm:table-cell`}>Waktu</TableHead>
                  <TableHead className={HEAD}>Email</TableHead>
                  <TableHead className={`${HEAD} hidden md:table-cell`}>Template</TableHead>
                  <TableHead className={HEAD}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((log) => (
                  <LogRow key={log.id} log={log} onOpen={() => setOpenId(log.id)} />
                ))}
              </TableBody>
            </Table>
          )}
          {data.total > data.pageSize && (
            <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800/80">
              <span>
                Halaman {data.page} dari {pages} · {data.total} email
              </span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Halaman sebelumnya"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Halaman berikutnya"
                  disabled={page >= pages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <LogDetail id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
