import Link from 'next/link';
import { ArrowLeft, FilmStrip } from '@phosphor-icons/react/dist/ssr';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex flex-col justify-between bg-bg text-fg film-grain px-6 py-10 selection:bg-accent selection:text-accent-fg relative overflow-hidden">
      {/* Ambient Top Glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] glow-gold-top -z-10" />

      {/* Top Navbar */}
      <header className="mx-auto w-full max-w-5xl flex items-center justify-between">
        <Link
          href="/"
          className="text-lg sm:text-xl font-black tracking-tighter text-fg hover:opacity-80 transition-opacity"
        >
          KAYASTORY<span className="text-accent">.</span>
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-dim">
          EXP // 404
        </span>
      </header>

      {/* Center 404 Stage */}
      <main className="mx-auto w-full max-w-xl text-center py-16 flex flex-col items-center justify-center">
        {/* 35mm Optical Viewfinder Frame with 404 */}
        <div className="relative rounded-2xl border border-white/15 bg-card/80 p-8 sm:p-10 backdrop-blur-xl shadow-2xl w-full max-w-md">
          {/* Corner Viewfinder Crop Marks */}
          <span className="absolute -top-1 -left-1 size-2.5 border-t-2 border-l-2 border-accent" />
          <span className="absolute -top-1 -right-1 size-2.5 border-t-2 border-r-2 border-accent" />
          <span className="absolute -bottom-1 -left-1 size-2.5 border-b-2 border-l-2 border-accent" />
          <span className="absolute -bottom-1 -right-1 size-2.5 border-b-2 border-r-2 border-accent" />

          {/* Film Icon & Spec */}
          <div className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-accent mb-4">
            <FilmStrip size={14} weight="bold" />
            <span>BLANK EXPOSURE • FRAME #00</span>
          </div>

          {/* Big 404 */}
          <h1 className="text-6xl sm:text-7xl font-black tracking-tighter text-white">
            4<span className="text-accent">0</span>4
          </h1>

          <p className="mt-4 text-base font-bold text-fg">
            Frame ini tidak ada dalam rol film.
          </p>

          <p className="mt-2 text-xs leading-relaxed text-muted">
            Halaman yang kamu cari mungkin telah berpindah lokasi atau belum pernah terabadikan di arsip kami.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-accent px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-accent-fg transition-all duration-200 hover:bg-accent-light active:scale-[0.97] shadow-lg shadow-accent/20"
            >
              <ArrowLeft size={14} weight="bold" className="transition-transform group-hover:-translate-x-1" />
              <span>Kembali ke Beranda</span>
            </Link>

            <Link
              href="/#portfolio"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-white/15 bg-bg px-6 py-3.5 text-xs font-semibold text-fg transition-all duration-200 hover:border-white/30 hover:bg-card-hover active:scale-[0.97]"
            >
              <span>Lihat Galeri Foto</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="mx-auto w-full max-w-5xl text-center font-mono text-[11px] text-muted-dim">
        <p>&copy; 2026 KAYASTORY PHOTOGRAPHY. SEMARANG, ID.</p>
      </footer>
    </div>
  );
}
