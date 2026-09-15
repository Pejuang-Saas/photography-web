import Preloader from './components/preloader';
import Gallery from './gallery';
import ScrollReveal from './components/scroll-reveal';
import HeroFilm from './components/hero-film';
import HeroEntrance from './components/hero-entrance';
import HeaderViewfinder from './components/header-viewfinder';
import PackageCard from './components/package-card';
import FAQAccordion from './components/faq-accordion';
import ColorGradeSlider from './components/color-grade-slider';
import CampusMarquee from './components/campus-marquee';
import TestimonialCard from './components/testimonial-card';
import MagneticButton from './components/magnetic-button';
import QuickBookingDock from './components/quick-booking-dock';
import FrameCounter from './components/frame-counter';
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

const portfolioTiles = [
  { src: '01', w: 2160, h: 2700, alt: 'Wisudawati berkebaya memegang map ijazah di lobi kampus' },
  { src: '02', w: 2160, h: 2700, alt: 'Sekelompok wisudawan berpose ceria bersama di tangga kampus' },
  { src: '03', w: 2160, h: 2700, alt: 'Wisudawati membawa buket bunga tersenyum lepas' },
  { src: '04', w: 2160, h: 2880, alt: 'Wisudawan berfoto bersama di Tugu Muda saat senja' },
  { src: '05', w: 2160, h: 2877, alt: 'Wisudawan melambaikan tangan dari mobil golf kampus' },
  { src: '06', w: 2160, h: 2700, alt: 'Wisudawan tersenyum dengan toga lengkap' },
  { src: '07', w: 2160, h: 2700, alt: 'Wisudawati berkebaya di halaman gedung kampus' },
  { src: '08', w: 2160, h: 2700, alt: 'Momen bahagia wisudawati bersama keluarga' },
  { src: '09', w: 2160, h: 2700, alt: 'Wisudawati menunjukkan medali kelulusan' },
  { src: '10', w: 2160, h: 2700, alt: 'Detail medali wisuda dalam genggaman tangan' },
  { src: '11', w: 2160, h: 2700, alt: 'Dua wisudawan bersalaman merayakan kelulusan bersama' },
  { src: '12', w: 2160, h: 2700, alt: 'Wisudawan berpose candid di sudut kampus' },
  { src: '13', w: 2160, h: 2700, alt: 'Wisudawati berbusana merah muda di taman kampus' },
  { src: '14', w: 2160, h: 2700, alt: 'Tiga sahabat berfoto bersama saat wisuda' },
  { src: '15', w: 2160, h: 2700, alt: 'Wisudawati memegang selempang sarjana hukum' },
  { src: '16', w: 2160, h: 2700, alt: 'Dua wisudawati duduk santai di rumput lapangan kampus' },
  { src: '17', w: 2160, h: 2700, alt: 'Sekelompok wisudawati merayakan kelulusan bersama' },
  { src: '18', w: 2160, h: 2700, alt: 'Wisudawati tersenyum cerah di bawah sinar matahari' },
  { src: '19', w: 2160, h: 2700, alt: 'Pose elegan wisudawati berlatar arsitektur kampus' },
  { src: '21', w: 2700, h: 3375, alt: 'Dua wisudawati berpose menunjuk ke kamera dengan riang' },
  { src: '22', w: 2880, h: 3840, alt: 'Momen wisuda malam hari penuh keceriaan' },
  { src: '24', w: 2880, h: 3840, alt: 'Sesi foto kelompok saat malam hari bertema nocturnal' },
];

const packages = [
  {
    name: 'Solo Graduation',
    cover: '01',
    summary: 'Sesi personal untuk kamu yang ingin foto kebaya dan toga dengan hasil yang anggun dan berkarakter.',
    price: 'Rp 350.000',
    features: [
      '1 Orang Wisudawan',
      'Durasi sesi 1 jam',
      '30 foto edited color grade',
      '1 titik lokasi kampus pilihan',
      'Seluruh file mentah dikirim via Drive',
    ],
    isFeatured: false,
  },
  {
    name: 'Squad Graduation',
    cover: '02',
    summary: 'Paling diminati untuk foto bersama geng sahabat, circle terdekat, atau satu divisi kampus.',
    price: 'Rp 650.000',
    badge: 'Paling Diminati',
    features: [
      '2 sampai 5 orang',
      'Durasi sesi 2 jam fleksibel',
      '60 foto edited color grade',
      '2 titik lokasi kampus',
      'Pengarahan pose dan interaksi natural',
      'Seluruh file mentah dikirim via Drive',
    ],
    isFeatured: true,
  },
  {
    name: 'Family Package',
    cover: '08',
    summary: 'Momen kelulusan hangat bersama orang tua dan keluarga besar tanpa batasan jumlah anggota.',
    price: 'Rp 900.000',
    features: [
      'Wisudawan plus keluarga inti',
      'Durasi sesi 3 jam santai',
      '100 foto edited color grade',
      'Lokasi bebas di area Semarang',
      '1 cetakan mini album fisik 20 halaman',
      'Seluruh file mentah dikirim via Drive',
    ],
    isFeatured: false,
  },
];

// Studix-style Featured Testimonial Stories
const featuredStories = [
  {
    quote:
      'Hasilnya jauh di atas ekspektasi. Fotografernya sabar banget mengarahkan pose, jadi kami yang awalnya kaku pun kelihatan lepas dan natural.',
    author: 'HASNA AULIA',
    campus: 'Universitas Dian Nuswantoro, Semarang',
    photo: '01',
  },
  {
    quote:
      'Kami foto berlima dan semuanya kebagian momen bagus. Tone warnanya konsisten, detail kebaya keluar rapi tanpa over-editing.',
    author: 'GLORIA MARGARETHA',
    campus: 'Universitas Diponegoro, Tembalang',
    photo: '16',
  },
  {
    quote:
      'Proses booking gampang, tim responsif di WhatsApp. Pas hari-H fotografer datang on-time dan hasilnya selesai tepat 7 hari kerja.',
    author: 'PASHA RAHMADANI',
    campus: 'Universitas Negeri Semarang, Sekaran',
    photo: '07',
  },
];

const steps = [
  {
    num: '01',
    title: 'Pilih Paket',
    desc: 'Tentukan paket yang sesuai kebutuhanmu, dari sesi Solo, Squad, hingga Family.',
  },
  {
    num: '02',
    title: 'Kunci Jadwal',
    desc: 'Konfirmasi tanggal lewat WhatsApp dengan DP 50% untuk mengamankan slot fotografer.',
  },
  {
    num: '03',
    title: 'Sesi Hari-H',
    desc: 'Tim fotografer hadir di kampus pilihanmu dan mengarahkan pose secara santai.',
  },
  {
    num: '04',
    title: 'Terima Arsip',
    desc: 'Akses seluruh file mentah di Drive dan terima hasil color grading dalam 7 hari kerja.',
  },
];

const faqs = [
  {
    q: 'Berapa lama proses editing sampai foto diterima?',
    a: 'Rata-rata 7 hari kerja setelah kamu memilih foto favoritmu. Jika membutuhkan foto lebih cepat, tersedia layanan Express 48 Jam.',
  },
  {
    q: 'Apakah bisa request lokasi foto di luar kampus?',
    a: 'Bisa. Untuk Paket Family, lokasi sudah bebas di area Semarang. Untuk paket Solo dan Squad, lokasi luar kampus dikenakan penyesuaian biaya transport yang wajar.',
  },
  {
    q: 'Bagaimana cara reservasi dan pembayarannya?',
    a: 'Pilih paket, isi form reservasi di WhatsApp, lalu bayar DP 50% untuk mengunci tanggal. Sisanya dilunasi setelah sesi foto selesai.',
  },
  {
    q: 'Apakah seluruh foto mentah ikut diberikan?',
    a: 'Ya. Seluruh file foto mentah kualitas original tanpa watermark dibagikan via link Google Drive, di samping foto-foto yang sudah diedit.',
  },
  {
    q: 'Bagaimana jika terjadi hujan atau jadwal wisuda berubah?',
    a: 'Reschedule gratis satu kali selama dikabari minimal H-1 sebelum pemotretan. DP tetap berlaku dan tidak hangus.',
  },
  {
    q: 'Apakah orang yang belum pernah photoshoot bisa diarahkan?',
    a: 'Tentu. Mayoritas klien kami baru pertama kali foto profesional. Fotografer kami memandu pose, gestur, dan ekspresi dari awal sampai selesai.',
  },
];

const navLinks = [
  { href: '#portfolio', label: 'Galeri', idx: '01' },
  { href: '#tentang', label: 'Tentang', idx: '02' },
  { href: '#paket', label: 'Paket', idx: '03' },
  { href: '#alur', label: 'Alur', idx: '04' },
  { href: '#testimoni', label: 'Testimoni', idx: '05' },
  { href: '#faq', label: 'FAQ', idx: '06' },
];

const campuses = [
  'UNIVERSITAS DIPONEGORO',
  'UNIVERSITAS NEGERI SEMARANG',
  'UNIVERSITAS DIAN NUSWANTORO',
  'POLINES',
  'UNIKA SOEGIJAPRANATA',
  'UIN WALISONGO',
];

// ────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-bg text-fg relative film-grain selection:bg-accent selection:text-accent-fg">
      {/* ── 35MM ASSET PRELOADER ── */}
      <Preloader />

      {/* ── AMBIENT TOP GLOW ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] glow-gold-top -z-10" />

      {/* ── CAMERA VIEWFINDER FRAMING HEADER ── */}
      <HeaderViewfinder navLinks={navLinks} />

      {/* ── SECTION 1: HERO ── */}
      <section
        id="top"
        className="relative flex min-h-[100dvh] items-center overflow-hidden px-4 pt-28 pb-16 lg:pt-36 lg:pb-24"
      >
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Staggered Entrance */}
          <HeroEntrance />

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
      <CampusMarquee campuses={campuses} />

      {/* ── SECTION 2: PORTFOLIO ── */}
      <section id="portfolio" className="scroll-mt-24 px-4 py-24 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-fg">
                Katalog Foto Wisuda
              </h2>
              <p className="mt-3 max-w-xl text-sm text-muted leading-relaxed">
                Setiap foto diproses dengan color grading berkarakter untuk mempertahankan
                detail natural dan keanggunan kebaya wisuda.
              </p>
            </div>
          </ScrollReveal>

          {/* Gallery with Morphing Pills & 35mm Lightbox Modal */}
          <Gallery tiles={portfolioTiles} />
        </div>
      </section>

      {/* ── SECTION 3: ABOUT STUDIO ── */}
      <section id="tentang" className="scroll-mt-24 px-4 py-24 lg:py-32 bg-bg-subtle/50 border-y border-white/5">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-12">
          {/* Left: Editorial Statements */}
          <ScrollReveal className="lg:col-span-7">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.08] text-fg">
              Bukan sekadar foto toga kaku.
              <br />
              <span className="text-muted font-normal">
                Kami menangkap rasa bangga, haru, dan tawa yang sesungguhnya.
              </span>
            </h2>

            <p className="mt-6 text-sm sm:text-base leading-relaxed text-muted max-w-xl">
              Kayastory berdiri di Semarang dari keyakinan sederhana: wisuda adalah
              puncak dari tahun-tahun perjuanganmu. Hari istimewa ini layak diabadikan
              dengan pengarahan gaya yang santai dan penuh makna.
            </p>

            {/* 3 Core Points */}
            <div className="mt-10 space-y-6">
              {[
                {
                  title: 'Kamu Tidak Perlu Berbakat Pose',
                  desc: 'Fotografer kami memandu dari gestur tangan, arah pandangan, hingga interaksi santai agar hasil foto terlihat lepas.',
                  icon: Sparkle,
                },
                {
                  title: 'Satu Hari, Slot Terkunci Khusus',
                  desc: 'Kami tidak menduplikasi jadwal pemotretan di jam yang sama. Waktu tim sepenuhnya didedikasikan untukmu.',
                  icon: ShieldCheck,
                },
                {
                  title: 'Seluruh File Mentah Diserahkan Penuh',
                  desc: 'Tidak ada biaya tersembunyi per-foto. Semua foto RAW dan JPG resolusi asli langsung menjadi arsip pribadimu.',
                  icon: FilmStrip,
                },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card border border-white/10 text-accent mt-0.5 shadow-sm">
                    <item.icon size={18} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-fg">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
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
                Pilihan Paket Foto
              </h2>
              <p className="mt-3 text-sm text-muted">
                Semua paket sudah termasuk seluruh file mentah dan foto edited kualitas master.
                Cukup DP 50% untuk mengunci tanggal wisudamu.
              </p>
            </div>
          </ScrollReveal>

          {/* 3 Visual Photo Package Cards with Spotlight Glow & Nested CTA */}
          <div className="mt-14 grid gap-8 lg:grid-cols-3 items-stretch">
            {packages.map((pkg, i) => (
              <ScrollReveal key={pkg.name} delay={i * 0.1}>
                <PackageCard pkg={pkg} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: HOW IT WORKS ── */}
      <section id="alur" className="scroll-mt-24 px-4 py-24 lg:py-32 bg-bg-subtle/40 border-y border-white/5">
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
              <ScrollReveal key={step.title} delay={idx * 0.08}>
                <div className="flex flex-col border-t border-white/15 pt-6 group">
                  <span className="font-mono text-xs font-bold text-accent transition-colors duration-200 group-hover:text-accent-light">
                    LANGKAH {step.num}
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-fg group-hover:text-white transition-colors duration-200">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {step.desc}
                  </p>
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
            {featuredStories.map((story, i) => (
              <ScrollReveal key={story.author} delay={i * 0.1}>
                <TestimonialCard story={story} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: FAQ (Editorial 2-Column Studio Layout with Smooth Accordion) ── */}
      <section id="faq" className="scroll-mt-24 px-4 py-24 lg:py-32 bg-bg-subtle/30 border-t border-white/5">
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
                Semua hal penting seputar reservasi, arahan gaya, lokasi pemotretan,
                hingga penyerahan file foto wisuda.
              </p>

              {/* Direct Support Card */}
              <div className="mt-8 rounded-2xl border border-white/10 bg-card p-6 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <WhatsappLogo size={20} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-fg">Butuh Info Tambahan?</h3>
                    <p className="text-xs text-muted">Konsultasi gratis langsung dengan tim fotografer.</p>
                  </div>
                </div>
                <a
                  href="https://wa.me/?text=Halo%20Kayastory!%20Saya%20ingin%20tanya%20seputar%20paket%20foto%20wisuda"
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
              <FAQAccordion items={faqs} />
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
                  href="https://wa.me/?text=Halo%20Kayastory!%20Saya%20ingin%20reservasi%20slot%20foto%20wisuda"
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
              <a href="#top" className="inline-block text-2xl font-black tracking-tighter text-fg hover:opacity-80 transition-opacity">
                KAYASTORY<span className="text-accent">.</span>
              </a>
              <p className="mt-4 text-xs leading-relaxed text-muted max-w-sm">
                Studio fotografi wisuda di Semarang yang mengabadikan momen kelulusan, kebaya, dan kebersamaan dengan estetika warna yang berkarakter.
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
                  <a href="#portfolio" className="hover:text-fg transition-colors">01. Katalog Foto</a>
                </li>
                <li>
                  <a href="#tentang" className="hover:text-fg transition-colors">02. Filosofi Studio</a>
                </li>
                <li>
                  <a href="#paket" className="hover:text-fg transition-colors">03. Pilihan Paket</a>
                </li>
                <li>
                  <a href="#alur" className="hover:text-fg transition-colors">04. Alur Pemesanan</a>
                </li>
                <li>
                  <a href="#testimoni" className="hover:text-fg transition-colors">05. Cerita Wisudawan</a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-fg transition-colors">06. Tanya Jawab (FAQ)</a>
                </li>
              </ul>
            </div>

            {/* Col 3: Area Kampus Semarang (2 cols) */}
            <div className="lg:col-span-2">
              <span className="block font-mono text-xs uppercase tracking-widest text-muted-dim mb-4">
                Area Kampus
              </span>
              <ul className="space-y-2 text-xs font-mono text-muted-dim">
                <li>UNDIP Tembalang</li>
                <li>UNNES Sekaran</li>
                <li>UDINUS Semarang</li>
                <li>POLINES</li>
                <li>UNIKA Soegijapranata</li>
                <li>UIN Walisongo</li>
              </ul>
            </div>

            {/* Col 4: Kontak & Studio Hours (3 cols) */}
            <div className="lg:col-span-3">
              <span className="block font-mono text-xs uppercase tracking-widest text-muted-dim mb-4">
                Kontak & Studio
              </span>
              <div className="space-y-3 text-xs text-muted">
                <p className="font-mono text-[11px] text-fg">Semarang, Jawa Tengah, ID</p>
                <p className="text-[11px]">Jam Operasional: 08.00 - 21.00 WIB</p>
                <div className="pt-2 flex items-center gap-3">
                  <a
                    href="https://wa.me/?text=Halo%20Kayastory!%20Saya%20ingin%20tanya%20seputar%20foto%20wisuda"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold text-fg hover:border-accent hover:text-accent active:scale-95 transition-all duration-150"
                  >
                    <WhatsappLogo size={14} weight="bold" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold text-fg hover:border-accent hover:text-accent active:scale-95 transition-all duration-150"
                  >
                    <InstagramLogo size={14} weight="bold" />
                    <span>Instagram</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Back to Top */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-dim">
            <p>&copy; 2026 KAYASTORY PHOTOGRAPHY. ALL RIGHTS RESERVED.</p>
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
              KAYASTORY
            </span>
          </div>
        </div>
      </footer>

      {/* ── 35MM RANGEFINDER SCROLL TRACKER & QUICK BOOKING DOCK ── */}
      <FrameCounter />
      <QuickBookingDock />
    </div>
  );
}
