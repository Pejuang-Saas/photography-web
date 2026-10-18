'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, LogOut, QrCode, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/admin-queries';
import type { WhatsappState, WhatsappStatus } from '@/lib/whatsapp-api';
import {
  useConnectWhatsapp,
  useDisconnectWhatsapp,
  useWhatsappStatus,
} from '@/lib/whatsapp-queries';
import { QueryError, QueryLoading } from '../../../components/query-state';
import QrDialog from './qr-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const BADGE: Record<WhatsappState, { label: string; className: string }> = {
  NOT_CONFIGURED: {
    label: 'Belum dikonfigurasi',
    className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  },
  UNREACHABLE: {
    label: 'WAHA tidak terjangkau',
    className: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
  },
  DISCONNECTED: {
    label: 'Belum terhubung',
    className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  },
  FAILED: {
    label: 'Koneksi gagal',
    className: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
  },
  STARTING: {
    label: 'Menghubungkan…',
    className: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
  },
  SCAN_QR: {
    label: 'Menunggu pemindaian',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  CONNECTED: {
    label: 'Terhubung & Aktif',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
};

/** "6285876543210" -> "+62 858-7654-3210" */
export function formatPhone(digits: string | null) {
  if (!digits) return '—';
  const match = digits.match(/^(62)(\d{3})(\d{4})(\d+)$/);
  return match ? `+${match[1]} ${match[2]}-${match[3]}-${match[4]}` : `+${digits}`;
}

function StateBadge({ state }: { state: WhatsappState }) {
  const { label, className } = BADGE[state];
  return (
    <Badge variant="outline" className={`gap-1.5 text-xs font-semibold ${className}`}>
      {state === 'CONNECTED' && (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
      )}
      {state === 'STARTING' && <Loader2 className="size-3 animate-spin" />}
      {label}
    </Badge>
  );
}

function ConnectedDetails({ status }: { status: WhatsappStatus }) {
  const rows = [
    ['Nomor WhatsApp', formatPhone(status.account?.phone ?? null)],
    ['Nama profil', status.account?.name ?? '—'],
    ['Sesi aktif', status.session],
    ['Engine', status.engine ?? '—'],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-4 text-xs sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-zinc-500">{label}</dt>
          <dd className="mt-0.5 break-words font-mono font-medium text-zinc-900 dark:text-zinc-100">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function WahaConnectionCard() {
  const [qrOpen, setQrOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const status = useWhatsappStatus(qrOpen);
  const connect = useConnectWhatsapp();
  const disconnect = useDisconnectWhatsapp();
  const state = status.data?.state;

  // The dialog only makes sense while a code is being made or waiting to be scanned, so it
  // closes by itself once the phone has linked (or the session was cancelled).
  const qrVisible = qrOpen && (state === 'STARTING' || state === 'SCAN_QR');

  const previous = useRef(state);
  useEffect(() => {
    if (state === 'CONNECTED' && previous.current && previous.current !== 'CONNECTED') {
      if (previous.current === 'SCAN_QR' || previous.current === 'STARTING') {
        toast.success('WhatsApp berhasil terhubung');
      }
    }
    previous.current = state;
  }, [state]);

  if (status.isLoading) return <QueryLoading rows={3} />;
  if (status.isError || !status.data) {
    return (
      <QueryError
        title="Status WhatsApp tidak dapat dimuat"
        message={errorMessage(status.error)}
        retry={() => status.refetch()}
      />
    );
  }
  const data = status.data;

  async function handleConnect() {
    const result = await connect.mutateAsync().catch(() => null);
    if (result) setQrOpen(true);
  }

  async function handleCheck() {
    const result = await status.refetch();
    if (result.data) toast.success(`Status sesi: ${BADGE[result.data.state].label}`);
  }

  return (
    <Card className="h-full rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
      <CardHeader className="border-b border-zinc-100 pb-4 dark:border-zinc-800/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold">Koneksi WhatsApp Studio</CardTitle>
            <CardDescription className="mt-1 text-xs">
              Nomor yang dipakai mengirim dan menerima pesan dari customer.
            </CardDescription>
          </div>
          <StateBadge state={data.state} />
        </div>
      </CardHeader>

      <CardContent
        className={`flex flex-1 flex-col justify-center gap-5 py-8 ${
          data.state === 'CONNECTED' ? '' : 'items-center text-center'
        }`}
      >
        {data.state === 'NOT_CONFIGURED' && (
          <div className="w-full rounded-lg border border-zinc-300/60 p-4 text-left text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            <p className="font-semibold text-zinc-900 dark:text-white">Koneksi belum disiapkan</p>
            <p className="mt-1">{data.detail}</p>
          </div>
        )}

        {data.state === 'UNREACHABLE' && (
          <div className="flex w-full items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/[0.05] p-4 text-left text-xs">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-500" />
            <div>
              <p className="font-semibold text-rose-700 dark:text-rose-300">
                Server WAHA tidak merespons
              </p>
              <p className="mt-1 break-words font-mono text-zinc-600 dark:text-zinc-400">
                {data.detail}
              </p>
            </div>
          </div>
        )}

        {(data.state === 'DISCONNECTED' || data.state === 'FAILED') && (
          <>
            <span className="flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <QrCode className="size-7" />
            </span>
            <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
              {data.state === 'FAILED'
                ? 'Sesi sebelumnya gagal. Hubungkan ulang dengan memindai kode QR baru.'
                : 'WhatsApp studio belum terhubung. Hubungkan untuk mulai menerima dan membalas chat customer.'}
            </p>
            <Button
              disabled={connect.isPending}
              onClick={handleConnect}
              className="gap-2 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {connect.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <QrCode className="size-4" />
              )}
              Hubungkan WhatsApp (Generate QR)
            </Button>
          </>
        )}

        {data.state === 'STARTING' && (
          <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Loader2 className="size-4 animate-spin" />
            Menghubungkan ke perangkat WhatsApp…
          </p>
        )}

        {data.state === 'SCAN_QR' && (
          <>
            <span className="flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <QrCode className="size-7" />
            </span>
            <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
              Kode QR sudah siap. Pindai dengan WhatsApp di ponsel studio untuk menyelesaikan
              koneksi.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => setQrOpen(true)}
                className="gap-2 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
              >
                <QrCode className="size-4" />
                Tampilkan QR
              </Button>
              <Button
                variant="outline"
                disabled={disconnect.isPending}
                onClick={() => disconnect.mutate()}
              >
                Batalkan
              </Button>
            </div>
          </>
        )}

        {data.state === 'CONNECTED' && (
          <>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              WhatsApp studio terhubung
            </p>
            <ConnectedDetails status={data} />
            <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-5 dark:border-zinc-800/80">
              <Button
                variant="outline"
                disabled={status.isFetching}
                onClick={handleCheck}
                className="gap-1.5"
              >
                <RefreshCw className={`size-3.5 ${status.isFetching ? 'animate-spin' : ''}`} />
                Cek Status Sesi
              </Button>
              <Button
                variant="outline"
                onClick={() => setLogoutOpen(true)}
                className="gap-1.5 border-rose-500/40 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
              >
                <LogOut className="size-3.5" />
                Putuskan Koneksi (Logout)
              </Button>
            </div>
          </>
        )}

        {(data.state === 'NOT_CONFIGURED' || data.state === 'UNREACHABLE') && (
          <Button
            variant="outline"
            size="sm"
            disabled={status.isFetching}
            onClick={() => status.refetch()}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${status.isFetching ? 'animate-spin' : ''}`} />
            Periksa lagi
          </Button>
        )}
      </CardContent>

      <QrDialog open={qrVisible} onClose={() => setQrOpen(false)} />

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Putuskan koneksi WhatsApp?</DialogTitle>
            <DialogDescription>
              Nomor studio akan keluar dari perangkat tertaut. Pesan tidak bisa dikirim atau
              diterima sampai Anda menghubungkannya lagi dengan memindai QR.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={disconnect.isPending}
              onClick={() =>
                disconnect.mutate(undefined, { onSuccess: () => setLogoutOpen(false) })
              }
            >
              {disconnect.isPending ? 'Memutuskan…' : 'Putuskan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
