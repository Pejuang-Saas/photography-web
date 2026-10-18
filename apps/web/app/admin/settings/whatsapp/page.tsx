'use client';

import { BellRing, ListChecks } from 'lucide-react';
import { errorMessage } from '@/lib/admin-queries';
import { useWhatsappStatus } from '@/lib/whatsapp-queries';
import WahaConnectionCard from './components/waha-connection-card';
import { Card, CardContent } from '@/components/ui/card';

const CARD =
  'rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60';

const STEPS = [
  'Klik "Hubungkan WhatsApp" untuk membuat kode QR.',
  'Di ponsel studio, buka WhatsApp, pilih Perangkat Tertaut, lalu Tautkan Perangkat.',
  'Pindai kode QR di layar. Status berubah menjadi hijau saat berhasil.',
];

function AutomationSection() {
  const status = useWhatsappStatus();
  const enabled = status.data?.automationEnabled;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
        <BellRing className="size-4 text-amber-500" />
        Notifikasi Otomatis
      </h2>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span className={`size-2 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
        <span className="text-zinc-900 dark:text-white">
          {status.isError
            ? errorMessage(status.error)
            : enabled
              ? 'Pengiriman otomatis aktif'
              : 'Pengiriman otomatis nonaktif'}
        </span>
      </p>
      <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        {enabled
          ? 'Pesan ke customer saat status reservasi berubah dikirim lewat nomor yang terhubung. Pastikan koneksi tetap hijau.'
          : 'Menghubungkan nomor tidak otomatis mengirim notifikasi ke customer. Saklarnya ada di konfigurasi server (WAHA_ENABLED), diatur oleh developer.'}
      </p>
    </section>
  );
}

function StepsSection() {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
        <ListChecks className="size-4 text-amber-500" />
        Cara Menghubungkan
      </h2>
      <ol className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
        {STEPS.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-bold text-amber-700 dark:text-amber-400">
              {index + 1}
            </span>
            <span className="pt-0.5 leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function WhatsappAutomationPage() {
  return (
    <div className="space-y-7">
      <div className="border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80">
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
          Otomasi WhatsApp
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
          Hubungkan nomor WhatsApp studio. Alamat dan kunci server WAHA diatur di server, tidak
          perlu diisi di sini.
        </p>
      </div>

      {/* Both columns are always the same height: the connection card centres its content. */}
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <WahaConnectionCard />
        <Card className={`${CARD} h-full`}>
          <CardContent className="space-y-6 py-8">
            <AutomationSection />
            <div className="border-t border-zinc-100 dark:border-zinc-800/80" />
            <StepsSection />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
