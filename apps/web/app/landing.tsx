import Preloader from './components/preloader';
import Gallery from './gallery';
import ScrollReveal from './components/scroll-reveal';
import HeroFilm from './components/hero-film';
import HeroEntrance from './components/hero-entrance';
import HeaderViewfinder from './components/header-viewfinder';
import PublicPackageCatalog from './components/public-package-catalog';
import FAQAccordion from './components/faq-accordion';
import ColorGradeSlider from './components/color-grade-slider';
import CampusMarquee from './components/campus-marquee';
import TestimonialCard from './components/testimonial-card';
import MagneticButton from './components/magnetic-button';
import QuickBookingDock from './components/quick-booking-dock';
import FrameCounter from './components/frame-counter';
import StructuredData from './components/structured-data';
import type { LandingCmsContent } from '@/lib/landing-cms';
import type { ServicePackage } from '@/lib/booking-api';
import { formatClock, whatsappLink } from '@/lib/format';
import type { LandingContent } from '@/lib/landing-content-api';
import { brandMark, FALLBACK_STUDIO_NAME, type StudioInfo } from '@/lib/studio-api';
import {
  FilmStrip,
  Sparkle,
  ShieldCheck,
  WhatsappLogo,
  InstagramLogo,
} from '@phosphor-icons/react/dist/ssr';

// ────────────────────────────────────────────────
// DATA
// ────────────────────────────────────────────────

const POINT_ICONS = [Sparkle, ShieldCheck, FilmStrip];

const navLinks = [
  { href: '#portfolio', label: 'Galeri', idx: '01' },
  { href: '#tentang', label: 'Tentang', idx: '02' },
  { href: '#paket', label: 'Paket', idx: '03' },
  { href: '#alur', label: 'Alur', idx: '04' },
  { href: '#testimoni', label: 'Testimoni', idx: '05' },
  { href: '#faq', label: 'FAQ', idx: '06' },
];

// ────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────

export default function Landing({
  cmsContent,
  content,
  studio,
  packages,
  allowDownPayment = true,
}: {
  cmsContent?: LandingCmsContent | null;
  content: LandingContent | null;
  studio?: StudioInfo | null;
  packages?: ServicePackage[] | null;
  allowDownPayment?: boolean;
}) {
  const studioName = studio?.studioName ?? FALLBACK_STUDIO_NAME;
  const greeting = `Halo ${studioName}!`;
  const waLink = (text: string) =>
    whatsappLink(studio?.whatsappNumber ?? '', `${greeting} ${text}`);
  const steps = content?.steps ?? [];
  const cmsGallery = cmsContent?.gallery ?? [];
  const galleryTiles = cmsGallery.map((item) => ({
    src: item.mediaAsset.url,
    w: 2160,
    h: 2700,
    alt: item.altText || item.title,
    category: item.category?.slug,
    categoryLabel: item.category?.name,
    campus: item.location ?? undefined,
    title: item.title,
  }));
  const galleryCategories = Array.from(
    new Map(
      cmsGallery
        .filter((item) => item.category)
        .map((item) => [
          item.category!.slug,
          { id: item.category!.slug, label: item.category!.name },
        ]),
    ).values(),
  );
  const landingMarquee = (cmsContent?.marquee ?? []).map((item) => item.text);
  const landingFaqs = (cmsContent?.faqs ?? []).map((item) => ({
    q: item.question,
    a: item.answer,
  }));
  const landingStories = (cmsContent?.testimonials ?? []).map((item) => ({
    quote: item.quote,
    author: item.customerName,
    campus: item.university || item.customerRole || '',
    photoUrl: item.mediaAsset?.url,
    rating: item.rating,
  }));

  return (
    <div className="min-h-[100dvh] flex flex-col bg-bg text-fg relative film-grain selection:bg-accent selection:text-accent-fg">
      <StructuredData
        studio={studio}
        description={content?.seo.description}
        packages={packages}
        testimonials={cmsContent?.testimonials}
        faqs={landingFaqs.map((item) => ({ question: item.q, answer: item.a }))}
      />
      {/* ── 35MM ASSET PRELOADER ── */}
      <Preloader brand={brandMark(studioName)} />

      {/* ── AMBIENT TOP GLOW ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] glow-gold-top -z-10" />

      {/* ── CAMERA VIEWFINDER FRAMING HEADER ── */}
      <HeaderViewfinder navLinks={navLinks} brand={brandMark(studioName)} />

      {/* ── SECTION 1: HERO ── */}
      <section
        id="top"
        className="relative flex min-h-[100dvh] items-center overflow-hidden px-4 pt-28 pb-16 lg:pt-36 lg:pb-24"
      >
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Staggered Entrance */}
          {content && <HeroEntrance hero={content.hero} />}

          {/* Right Column: Dual Infinite Film Strips with Spring Interactive Tilt */}
          <div className="flex items-center justify-center lg:col-span-5 lg:justify-end">
            <HeroFilm
              stripA={['02', '04', '08', '11', '12', '14']}
              stripB={['05', '13', '15', '18', '19', '08']}
            />
          </div>
        </div>
      </section>

      {/* ── CAMPUS RIBBON (Marquee with Edge Alpha Gradient Masks) ── */}
      <CampusMarquee campuses={landingMarquee} />

      {/* ── SECTION 2: PORTFOLIO ── */}
      <section id="portfolio" className="scroll-mt-24 px-4 py-24 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-fg">
                {content?.portfolio.heading}
              </h2>
              <p className="mt-3 max-w-xl text-sm text-muted leading-relaxed">
                {content?.portfolio.description}
              </p>
            </div>
          </ScrollReveal>

          {/* Gallery with Morphing Pills & 35mm Lightbox Modal */}
          <Gallery
            tiles={galleryTiles}
            categoryOptions={galleryCategories}
            whatsappNumber={studio?.whatsappNumber ?? null}
            studioName={studioName}
          />
        </div>
      </section>

      {/* ── SECTION 3: ABOUT STUDIO ── */}
      <section
        id="tentang"
        className="scroll-mt-24 px-4 py-24 lg:py-32 bg-bg-subtle/50 border-y border-white/5"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-12">
          {/* Left: Editorial Statements */}
          <ScrollReveal className="lg:col-span-7">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.08] text-fg">
              {content?.about.heading}
              {content?.about.subheading && (
                <>
                  <br />
                  <span className="text-muted font-normal">{content.about.subheading}</span>
                </>
              )}
            </h2>

            {content?.about.body && (
              <p className="mt-6 text-sm sm:text-base leading-relaxed text-muted max-w-xl">
                {content.about.body}
              </p>
            )}

            {/* Key points, managed in the admin */}
            <div className="mt-10 space-y-6">
              {(content?.about.points ?? []).map((item, idx) => {
                const Icon = POINT_ICONS[idx % POINT_ICONS.length];
                return (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card border border-white/10 text-accent mt-0.5 shadow-sm">
                      <Icon size={18} weight="bold" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-fg">{item.title}</h3>
                      <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollReveal>

          {/* Right: Interactive 35mm Before/After Color Grading Comparison */}
          <ScrollReveal delay={0.15} className="lg:col-span-5 flex justify-center">
            <ColorGradeSlider imageSrc="/portfolio/kayastory-22.jpg" />
          </ScrollReveal>
        </div>
      </section>

      {/* ── SECTION 4: VISUAL PHOTO PACKAGES ── */}
      <section id="paket" className="scroll-mt-24 px-4 py-24 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-fg">
                {content?.packages.heading}
              </h2>
              <p className="mt-3 text-sm text-muted">
                {content?.packages.description}{' '}
                {allowDownPayment
                  ? 'Cukup DP 50% untuk mengunci tanggal wisudamu.'
                  : 'Bayar lunas untuk mengunci tanggal wisudamu.'}
              </p>
            </div>
          </ScrollReveal>

          <PublicPackageCatalog initialPackages={packages} />
        </div>
      </section>

      {/* ── SECTION 5: HOW IT WORKS ── */}
      <section
        id="alur"
        className="scroll-mt-24 px-4 py-24 lg:py-32 bg-bg-subtle/40 border-y border-white/5"
      >
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-fg">
                Alur Pemesanan
              </h2>
              <p className="mt-3 max-w-md text-sm text-muted">
                Empat langkah praktis dari konsultasi hingga hasil foto di tanganmu.
              </p>
            </div>
          </ScrollReveal>

          {/* 4 Steps (Original Clean Minimalist Layout) */}
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, idx) => (
              <ScrollReveal key={idx} delay={idx * 0.08}>
                <div className="flex flex-col border-t border-white/15 pt-6 group">
                  <span className="font-mono text-xs font-bold text-accent transition-colors duration-200 group-hover:text-accent-light">
                    LANGKAH {String(idx + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-fg group-hover:text-white transition-colors duration-200">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{step.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: TESTIMONIALS (Studix Editorial Layout with Spotlight Cards) ── */}
      <section id="testimoni" className="scroll-mt-24 px-4 py-24 lg:py-32">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6 mb-12">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-accent">
                  Cerita Wisudawan
                </span>
                <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase leading-[0.98]">
                  Cerita Dari Mereka,
                  <br />
                  Bukan Dari Kami.
                </h2>
              </div>
              <p className="max-w-xs text-xs sm:text-sm text-muted">
                Pengalaman nyata sesi wisuda bersama Kayastory di Semarang.
              </p>
            </div>
          </ScrollReveal>

          {/* Studix-Style Stacked Story Cards with Spotlight */}
          <div className="space-y-6">
            {landingStories.map((story, i) => (
              <ScrollReveal key={story.author} delay={i * 0.1}>
                <TestimonialCard story={story} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: FAQ (Editorial 2-Column Studio Layout with Smooth Accordion) ── */}
      <section
        id="faq"
        className="scroll-mt-24 px-4 py-24 lg:py-32 bg-bg-subtle/30 border-t border-white/5"
      >
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-start">
            {/* Left Column: Sticky Studio Heading & Quick Support */}
            <ScrollReveal className="lg:col-span-5 lg:sticky lg:top-28">
              <span className="text-xs font-mono uppercase tracking-widest text-accent">
                Tanya Jawab
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-fg leading-[1.05]">
                Pertanyaan yang Sering Diajukan.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Semua hal penting seputar reservasi, arahan gaya, lokasi pemotretan, hingga
                penyerahan file foto wisuda.
              </p>

              {/* Direct Support Card */}
              <div className="mt-8 rounded-2xl border border-white/10 bg-card p-6 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <WhatsappLogo size={20} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-fg">Butuh Info Tambahan?</h3>
                    <p className="text-xs text-muted">
                      Konsultasi gratis langsung dengan tim fotografer.
                    </p>
                  </div>
                </div>
                <a
                  href={waLink('Saya ingin tanya seputar paket foto wisuda')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 block w-full rounded-xl bg-accent px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-accent-fg hover:bg-accent-light transition-all duration-200 active:scale-[0.97] shadow-md shadow-accent/10"
                >
                  Chat WhatsApp Studio ↗
                </a>
              </div>
            </ScrollReveal>

            {/* Right Column: Smooth Animated Accordion */}
            <ScrollReveal className="lg:col-span-7">
              <FAQAccordion items={landingFaqs} />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── SECTION 8: STUDIO FINALE (Pure Editorial Closing with Magnetic CTA) ── */}
      <section className="scroll-mt-24 border-t border-white/10 px-6 py-28 lg:py-40 bg-bg relative overflow-hidden">
        {/* Subtle camera aperture ambient ring glow in the background */}
        <div className="pointer-events-none absolute right-0 bottom-0 size-[500px] rounded-full bg-accent/[0.03] blur-3xl -z-0" />

        <div className="mx-auto max-w-6xl relative z-10">
          <ScrollReveal>
            <div className="grid gap-12 lg:grid-cols-12 items-end justify-between">
              <div className="lg:col-span-8">
                <span className="font-mono text-xs uppercase tracking-widest text-accent block mb-4">
                  Reservasi Wisuda 2026 • Semarang
                </span>
                <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] text-fg leading-[0.98]">
                  Abadikan momen kelulusanmu bersama Kayastory.
                </h2>
                <p className="mt-6 max-w-xl text-base sm:text-lg text-muted font-normal leading-relaxed">
                  Slot pemotretan dikunci khusus untuk setiap wisudawan tanpa tumpang tindih jadwal.
                  Konsultasikan tanggal dan paket fotomu langsung dengan tim kami.
                </p>
              </div>

              <div className="lg:col-span-4 lg:flex lg:justify-end">
                <MagneticButton
                  href={waLink('Saya ingin reservasi slot foto wisuda')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 rounded-full bg-accent px-8 py-5 text-sm font-bold uppercase tracking-wider text-accent-fg transition-all duration-300 hover:bg-accent-light shadow-2xl shadow-accent/25 hover:shadow-accent/40"
                  strength={0.3}
                >
                  <span>Mulai Reservasi</span>
                  <span className="text-base transition-transform duration-200 group-hover:translate-x-1.5 group-hover:-translate-y-0.5 font-mono">
                    ↗
                  </span>
                </MagneticButton>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── HIGH-END STUDIO FOOTER ── */}
      <footer className="relative overflow-hidden border-t border-white/10 bg-black pt-20 pb-12 px-6">
        <div className="mx-auto max-w-6xl">
          {/* Top 4-Column Directory */}
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12 pb-16 border-b border-white/10">
            {/* Col 1: Studio Identity (4 cols) */}
            <div className="lg:col-span-4">
              <a
                href="#top"
                className="inline-block text-2xl font-black tracking-tighter text-fg hover:opacity-80 transition-opacity"
              >
                KAYASTORY<span className="text-accent">.</span>
              </a>
              <p className="mt-4 text-xs leading-relaxed text-muted max-w-sm">
                Studio fotografi wisuda di Semarang yang mengabadikan momen kelulusan, kebaya, dan
                kebersamaan dengan estetika warna yang berkarakter.
              </p>
              <div className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-accent">
                <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                <span>Menerima Reservasi Wisuda 2026</span>
              </div>
            </div>

            {/* Col 2: Indeks Menu (3 cols) */}
            <div className="lg:col-span-3">
              <span className="block font-mono text-xs uppercase tracking-widest text-muted-dim mb-4">
                Indeks
              </span>
              <ul className="space-y-2.5 text-xs text-muted">
                <li>
                  <a href="#portfolio" className="hover:text-fg transition-colors">
                    01. Katalog Foto
                  </a>
                </li>
                <li>
                  <a href="#tentang" className="hover:text-fg transition-colors">
                    02. Filosofi Studio
                  </a>
                </li>
                <li>
                  <a href="#paket" className="hover:text-fg transition-colors">
                    03. Pilihan Paket
                  </a>
                </li>
                <li>
                  <a href="#alur" className="hover:text-fg transition-colors">
                    04. Alur Pemesanan
                  </a>
                </li>
                <li>
                  <a href="#testimoni" className="hover:text-fg transition-colors">
                    05. Cerita Wisudawan
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-fg transition-colors">
                    06. Tanya Jawab (FAQ)
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Area Kampus (2 cols), taken from the marquee list managed in the CMS */}
            <div className="lg:col-span-2">
              {landingMarquee.length > 0 && (
                <>
                  <span className="block font-mono text-xs uppercase tracking-widest text-muted-dim mb-4">
                    Area Kampus
                  </span>
                  <ul className="space-y-2 text-xs font-mono text-muted-dim">
                    {landingMarquee.map((campus) => (
                      <li key={campus}>{campus}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Col 4: Kontak & Studio Hours (3 cols) */}
            <div className="lg:col-span-3">
              <span className="block font-mono text-xs uppercase tracking-widest text-muted-dim mb-4">
                Kontak & Studio
              </span>
              <div className="space-y-3 text-xs text-muted">
                {studio?.address && (
                  <p className="font-mono text-[11px] text-fg">
                    {studio.mapsUrl ? (
                      <a
                        href={studio.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-2 hover:text-accent hover:underline"
                      >
                        {studio.address}
                      </a>
                    ) : (
                      studio.address
                    )}
                  </p>
                )}
                {studio?.openTime && studio.closeTime && (
                  <p className="text-[11px]">
                    Jam Operasional: {formatClock(studio.openTime)} -{' '}
                    {formatClock(studio.closeTime)} WIB
                  </p>
                )}
                <div className="pt-2 flex items-center gap-3">
                  <a
                    href={waLink('Saya ingin tanya seputar foto wisuda')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold text-fg hover:border-accent hover:text-accent active:scale-95 transition-all duration-150"
                  >
                    <WhatsappLogo size={14} weight="bold" />
                    <span>WhatsApp</span>
                  </a>
                  {studio?.instagramUrl && (
                    <a
                      href={studio.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold text-fg hover:border-accent hover:text-accent active:scale-95 transition-all duration-150"
                    >
                      <InstagramLogo size={14} weight="bold" />
                      <span>Instagram</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Back to Top */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-dim">
            <p>
              &copy; {new Date().getFullYear()} {studioName.toUpperCase()}. ALL RIGHTS RESERVED.
            </p>
            <a
              href="#top"
              className="inline-flex items-center gap-1.5 hover:text-fg transition-colors active:scale-95"
            >
              <span>Kembali ke Atas</span>
              <span className="text-accent">↑</span>
            </a>
          </div>

          {/* Giant Studio Architectural Watermark */}
          <div className="mt-14 text-center select-none pointer-events-none overflow-hidden">
            <span className="block text-[clamp(3.5rem,14vw,9.5rem)] font-black tracking-tighter text-white/[0.03] leading-none uppercase">
              {studioName.split(' ')[0].toUpperCase()}
            </span>
          </div>
        </div>
      </footer>

      {/* ── 35MM RANGEFINDER SCROLL TRACKER & QUICK BOOKING DOCK ── */}
      <FrameCounter />
      <QuickBookingDock whatsappNumber={studio?.whatsappNumber ?? null} studioName={studioName} />
    </div>
  );
}
