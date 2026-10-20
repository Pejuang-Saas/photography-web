import Link from 'next/link';
import { whatsappLink } from '@/lib/format';
import type { StudioInfo } from '@/lib/studio-api';

/** What a visitor sees at a booking address while the studio has reservations switched off. */
export default function ReservationsClosed({
  studio,
  packageName,
}: {
  studio: StudioInfo | null;
  packageName?: string;
}) {
  const name = studio?.studioName ?? 'Studio';
  return (
    <div className="dark bg-bg text-fg">
      <main className="mx-auto flex min-h-[100dvh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
          Reservasi ditutup sementara
        </p>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
          {packageName ? `${packageName} belum bisa dipesan` : 'Reservasi belum dibuka'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {name} sedang tidak menerima reservasi online. Katalog paket tetap bisa kamu lihat, dan
          kamu bisa menanyakan jadwal langsung ke tim kami.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/#paket"
            className="rounded-full bg-accent px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-accent-fg transition-colors hover:bg-accent-light"
          >
            Lihat katalog paket
          </Link>
          {studio?.whatsappNumber && (
            <a
              href={whatsappLink(
                studio.whatsappNumber,
                `Halo ${name}! Saya ingin menanyakan jadwal foto wisuda.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/15 px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-fg transition-colors hover:border-accent hover:text-accent"
            >
              Tanya via WhatsApp
            </a>
          )}
        </div>
      </main>
    </div>
  );
}
