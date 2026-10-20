import { ChatCircleText, Clock, WhatsappLogo } from '@phosphor-icons/react/dist/ssr';
import ScrollReveal from './scroll-reveal';

const STEPS = [
  {
    title: 'Pilih paket',
    description: 'Lihat katalog di atas dan tentukan paket serta tambahan yang kamu butuhkan.',
  },
  {
    title: 'Chat tim kami',
    description:
      'Kirim tanggal, jam, dan paket pilihanmu lewat WhatsApp. Kami cek ketersediaan jadwalnya.',
  },
  {
    title: 'Konfirmasi jadwal',
    description: 'Setelah jadwal disepakati, tim kami memandu pembayaran untuk mengunci tanggalmu.',
  },
];

/**
 * Shown in place of the online ordering steps while reservations are switched off: how to book
 * through a chat instead.
 */
export default function ReservationInfo({
  whatsappHref,
  hours,
}: {
  /** Null when the studio has no WhatsApp number yet; the chat button is left out then. */
  whatsappHref: string | null;
  /** Opening hours as written, e.g. "08.00 - 21.00 WIB"; omitted when the studio set none. */
  hours?: string | null;
}) {
  return (
    <section
      id="info-reservasi"
      className="scroll-mt-24 border-y border-white/5 bg-bg-subtle/40 px-4 py-24 lg:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <div className="max-w-xl">
            <p className="mb-3 text-sm font-semibold text-fg/70">Reservasi online sedang ditutup</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-fg sm:text-4xl lg:text-5xl">
              Info Reservasi
            </h2>
            <p className="mt-3 text-sm text-muted">
              Untuk sementara reservasi dilayani lewat chat. Tanyakan jadwal dan ketersediaan slot
              langsung ke tim kami.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <ScrollReveal key={step.title} delay={index * 0.08}>
              <div className="flex flex-col border-t border-white/15 pt-6">
                <span className="text-sm font-semibold text-muted">Langkah {index + 1}</span>
                <h3 className="mt-3 text-lg font-bold text-fg">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.2}>
          <div className="mt-12 flex flex-col gap-6 rounded-3xl border border-white/10 bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-fg/80">
                <ChatCircleText size={22} weight="bold" />
              </span>
              <div>
                <p className="text-base font-bold text-fg">Pesan lewat WhatsApp</p>
                {hours && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                    <Clock size={14} weight="bold" />
                    Jam operasional {hours}
                  </p>
                )}
              </div>
            </div>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-accent px-7 text-xs font-bold uppercase tracking-wider text-accent-fg transition-colors duration-200 hover:bg-accent-light active:scale-[0.97]"
              >
                <WhatsappLogo size={17} weight="fill" />
                <span>Chat via WhatsApp</span>
              </a>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
