'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { WhatsappLogo, X, ArrowsOut, CaretLeft, CaretRight } from '@phosphor-icons/react';

export type Tile = {
  src: string;
  w: number;
  h: number;
  alt: string;
  category?: string;
  campus?: string;
  title?: string;
  focal?: string;
};

const INITIAL_COUNT = 8;

const CATEGORIES = [
  { id: 'all', label: 'Semua Foto' },
  { id: 'portrait', label: 'Kebaya & Solo' },
  { id: 'squad', label: 'Squad & Bestie' },
  { id: 'campus', label: 'Outdoor Kampus' },
  { id: 'details', label: 'Detail & Medali' },
];

export default function Gallery({ tiles }: { tiles: Tile[] }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const enrichedTiles = useMemo(() => {
    return tiles.map((t) => {
      let category = 'portrait';
      let campus = 'Universitas Diponegoro, Semarang';
      let title = 'Sesi Wisuda Kebaya & Solo';
      let focal = '35mm f/1.4';

      if (['02', '04', '05', '14', '16', '17', '21', '24'].includes(t.src)) {
        category = 'squad';
        campus = 'Universitas Diponegoro, Tembalang';
        title = 'Squad & Bestie Graduation';
        focal = '28mm f/2.0';
      } else if (['04', '05', '07', '11', '13'].includes(t.src)) {
        category = 'campus';
        campus = 'Universitas Negeri Semarang, Sekaran';
        title = 'Outdoor Campus Session';
        focal = '50mm f/1.4';
      } else if (['09', '10', '15'].includes(t.src)) {
        category = 'details';
        campus = 'UDINUS Semarang';
        title = 'Detail Medali & Selempang';
        focal = '85mm f/1.8';
      }

      return {
        ...t,
        category,
        campus,
        title,
        focal,
      };
    });
  }, [tiles]);

  const filteredTiles = useMemo(() => {
    if (activeCategory === 'all') return enrichedTiles;
    return enrichedTiles.filter((t) => t.category === activeCategory);
  }, [enrichedTiles, activeCategory]);

  const visibleTiles = showAll ? filteredTiles : filteredTiles.slice(0, INITIAL_COUNT);
  const selectedTile = selectedIndex !== null ? filteredTiles[selectedIndex] : null;

  // Keyboard navigation (Esc to close, ArrowLeft / ArrowRight to slide)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (selectedIndex === null) return;

      if (e.key === 'Escape') {
        setSelectedIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) =>
          prev !== null ? (prev - 1 + filteredTiles.length) % filteredTiles.length : null
        );
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) =>
          prev !== null ? (prev + 1) % filteredTiles.length : null
        );
      }
    },
    [selectedIndex, filteredTiles.length]
  );

  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIndex, handleKeyDown]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) =>
      prev !== null ? (prev - 1 + filteredTiles.length) % filteredTiles.length : null
    );
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) =>
      prev !== null ? (prev + 1) % filteredTiles.length : null
    );
  };

  return (
    <div className="mt-10">
      {/* ── Category Filter Pills with Morphing Indicator ── */}
      <div className="flex flex-wrap items-center gap-2 pb-8">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          const count =
            cat.id === 'all'
              ? enrichedTiles.length
              : enrichedTiles.filter((t) => t.category === cat.id).length;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setShowAll(false);
              }}
              className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium tracking-wide transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isActive
                  ? 'text-accent-fg font-semibold'
                  : 'bg-card text-muted hover:text-fg border border-border-c hover:border-white/20'
              }`}
            >
              {/* Morphing active pill indicator */}
              {isActive && (
                <motion.span
                  layoutId="activeCategoryPill"
                  className="absolute inset-0 rounded-full bg-accent shadow-sm"
                  transition={{
                    type: 'spring',
                    duration: shouldReduceMotion ? 0 : 0.45,
                    bounce: 0.15,
                  }}
                />
              )}

              <span className="relative z-10">{cat.label}</span>
              <span
                className={`relative z-10 text-[10px] ${
                  isActive ? 'text-black/75 font-bold' : 'text-muted-dim'
                }`}
              >
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Masonry Grid ── */}
      <div className="relative">
        <motion.div
          layout={!shouldReduceMotion}
          className="columns-2 gap-4 sm:columns-2 md:columns-3 lg:columns-4 [column-fill:_balance]"
        >
          <AnimatePresence mode="popLayout">
            {visibleTiles.map((t, i) => (
              <motion.div
                key={`${t.src}-${t.category}`}
                layout={!shouldReduceMotion}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={{
                  duration: 0.35,
                  delay: shouldReduceMotion ? 0 : Math.min(i * 0.02, 0.2),
                  ease: [0.23, 1, 0.32, 1],
                }}
                className="group mb-4 break-inside-avoid cursor-pointer"
                onClick={() => setSelectedIndex(i)}
              >
                <div className="relative overflow-hidden rounded-xl bg-card border border-border-c transition-all duration-500 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5">
                  <Image
                    src={`/portfolio/kayastory-${t.src}.jpg`}
                    alt={t.alt}
                    width={t.w}
                    height={t.h}
                    priority={i < 4}
                    sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                    className="h-auto w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/* Optical Expand Hint */}
                  <div className="absolute top-3 right-3 size-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <ArrowsOut size={13} weight="bold" />
                  </div>

                  {/* Subtle caption overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end p-3.5">
                    <div>
                      <p className="text-xs font-bold text-white tracking-wide">
                        {t.title}
                      </p>
                      <p className="text-[11px] font-mono text-accent">
                        {t.campus}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Gradient fade when collapsed */}
        {!showAll && filteredTiles.length > INITIAL_COUNT && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-bg via-bg/90 to-transparent"
          />
        )}
      </div>

      {/* ── Expand Toggle ── */}
      {filteredTiles.length > INITIAL_COUNT && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex items-center gap-2.5 rounded-full border border-border-c bg-card px-7 py-3 text-xs font-semibold tracking-wider text-fg transition-all duration-200 hover:border-accent hover:text-accent active:scale-[0.97]"
          >
            <span>
              {showAll
                ? 'Tampilkan Lebih Sedikit'
                : `Buka Seluruh Galeri (${filteredTiles.length} Foto)`}
            </span>
            <span className="font-mono text-accent">{showAll ? '▲' : '▼'}</span>
          </button>
        </div>
      )}

      {/* ── IMMERSIVE EDITORIAL LIGHTBOX / THEATER VIEW (ANTI-SLOP) ── */}
      <AnimatePresence>
        {selectedTile && selectedIndex !== null && (
          <div
            className="fixed inset-0 z-[999] flex flex-col justify-between bg-black/95 backdrop-blur-2xl p-4 sm:p-6 lg:p-8 select-none"
            onClick={() => setSelectedIndex(null)}
          >
            {/* ── Top Bar: Clean Minimalist Frame Metadata & Close ── */}
            <div
              className="relative z-20 flex items-center justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left: Studio Index */}
              <div className="flex items-center gap-3 font-mono text-xs text-muted">
                <span className="font-bold tracking-widest text-fg">KAYASTORY ARCHIVE</span>
                <span className="text-accent">•</span>
                <span>
                  FRAME {String(selectedIndex + 1).padStart(2, '0')} / {String(filteredTiles.length).padStart(2, '0')}
                </span>
              </div>

              {/* Right: Close Button */}
              <button
                type="button"
                onClick={() => setSelectedIndex(null)}
                className="group flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted transition-all duration-200 hover:border-accent hover:text-accent hover:bg-white/10 active:scale-95"
              >
                <span>Tutup</span>
                <span className="text-[10px] text-muted-dim font-mono group-hover:text-accent/70">[ESC]</span>
                <X size={14} weight="bold" />
              </button>
            </div>

            {/* ── Center Stage: Hero Photo with Previous / Next Controls ── */}
            <div
              className="relative flex flex-1 items-center justify-center py-4 min-h-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Navigation Chevron */}
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Foto Sebelumnya"
                className="absolute left-2 sm:left-6 z-20 flex size-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-fg backdrop-blur-md transition-all duration-200 hover:border-accent hover:text-accent hover:scale-110 active:scale-95 shadow-xl"
              >
                <CaretLeft size={22} weight="bold" />
              </button>

              {/* High-Resolution Hero Photo Frame */}
              <motion.div
                key={selectedTile.src}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="relative h-full max-h-[70vh] w-full max-w-3xl flex items-center justify-center"
              >
                <div className="relative h-full w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                  <Image
                    src={`/portfolio/kayastory-${selectedTile.src}.jpg`}
                    alt={selectedTile.alt}
                    fill
                    sizes="(max-width: 1024px) 95vw, 850px"
                    className="object-contain"
                    priority
                  />
                </div>
              </motion.div>

              {/* Right Navigation Chevron */}
              <button
                type="button"
                onClick={handleNext}
                aria-label="Foto Selanjutnya"
                className="absolute right-2 sm:right-6 z-20 flex size-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-fg backdrop-blur-md transition-all duration-200 hover:border-accent hover:text-accent hover:scale-110 active:scale-95 shadow-xl"
              >
                <CaretRight size={22} weight="bold" />
              </button>
            </div>

            {/* ── Bottom Bar: Sleek Editorial Caption & WhatsApp Action ── */}
            <div
              className="relative z-20 mx-auto w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-white/15 bg-[#141312]/95 px-6 py-4 backdrop-blur-2xl shadow-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-fg">
                      {selectedTile.title}
                    </h3>
                    <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent font-semibold">
                      {selectedTile.focal}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {selectedTile.campus} • {selectedTile.alt}
                  </p>
                </div>

                {/* Refined CTA Button */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Halo Kayastory! Saya tertarik dengan konsep foto wisuda katalog #${selectedTile.src} (${selectedTile.title} di ${selectedTile.campus}). Boleh info paketnya?`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-accent-fg transition-all duration-200 hover:bg-accent-light active:scale-[0.96] shadow-lg shadow-accent/20"
                >
                  <WhatsappLogo size={15} weight="bold" />
                  <span>Reservasi Konsep Ini</span>
                  <span className="font-mono text-xs transition-transform duration-200 group-hover:translate-x-0.5">
                    ↗
                  </span>
                </a>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
