'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { WhatsappLogo, X, ArrowsOut, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { whatsappLink } from '@/lib/format';

export type Tile = {
  src: string;
  w: number;
  h: number;
  alt: string;
  category?: string;
  categoryLabel?: string;
  campus?: string;
  title?: string;
};

const INITIAL_COUNT = 8;

/** The lines under a photo, leaving out what the studio did not fill in. */
const captionOf = (campus: string | undefined, alt: string) =>
  [campus, alt].filter(Boolean).join(' • ');

function getTileImageSrc(src: string) {
  return /^https?:\/\//i.test(src) ? src : `/portfolio/kayastory-${src}.jpg`;
}

const DEFAULT_CATEGORIES = [
  { id: 'all', label: 'Semua Foto' },
  { id: 'portrait', label: 'Kebaya & Solo' },
  { id: 'squad', label: 'Squad & Bestie' },
  { id: 'campus', label: 'Outdoor Kampus' },
  { id: 'details', label: 'Detail & Medali' },
];

export default function Gallery({
  tiles,
  categoryOptions,
  whatsappNumber = null,
  studioName = 'Kayastory',
}: {
  tiles: Tile[];
  categoryOptions?: Array<{ id: string; label: string }>;
  whatsappNumber?: string | null;
  studioName?: string;
}) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const categories = categoryOptions?.length
    ? [{ id: 'all', label: 'Semua Foto' }, ...categoryOptions]
    : DEFAULT_CATEGORIES;

  // A photo shows only what the studio entered for it. Photos with no category stay under "Semua".
  const enrichedTiles = useMemo(
    () =>
      tiles.map((t) => ({
        ...t,
        category: t.category ?? 'uncategorized',
        title: t.title ?? t.alt,
      })),
    [tiles],
  );

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
          prev !== null ? (prev - 1 + filteredTiles.length) % filteredTiles.length : null,
        );
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev !== null ? (prev + 1) % filteredTiles.length : null));
      }
    },
    [selectedIndex, filteredTiles.length],
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
      prev !== null ? (prev - 1 + filteredTiles.length) % filteredTiles.length : null,
    );
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev !== null ? (prev + 1) % filteredTiles.length : null));
  };

  return (
    <div className="mt-10">
      {/* ── Category Filter Pills with Morphing Indicator ── */}
      <div className="flex flex-wrap items-center gap-2 pb-8">
        {categories.map((cat) => {
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
              className={`relative inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-xs font-medium tracking-wide transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
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
                className={`relative z-10 text-xs ${
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
                <div className="relative overflow-hidden rounded-xl bg-card border border-border-c transition-all duration-500 hover:border-accent/40">
                  <Image
                    src={getTileImageSrc(t.src)}
                    alt={t.alt}
                    width={t.w}
                    height={t.h}
                    priority={i < 4}
                    sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                    className="h-auto w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/* Optical Expand Hint */}
                  <div className="absolute top-3 right-3 size-7 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <ArrowsOut size={13} weight="bold" />
                  </div>

                  {/* Subtle caption overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end p-3.5">
                    <div>
                      <p className="text-xs font-bold text-white tracking-wide">{t.title}</p>
                      {t.campus && <p className="text-xs text-fg/80">{t.campus}</p>}
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
            className="inline-flex min-h-11 items-center gap-2.5 rounded-full border border-border-c bg-card px-7 text-xs font-semibold tracking-wider text-fg transition-all duration-200 hover:border-accent hover:text-accent active:scale-[0.97]"
          >
            <span>
              {showAll
                ? 'Tampilkan Lebih Sedikit'
                : `Buka Seluruh Galeri (${filteredTiles.length} Foto)`}
            </span>
          </button>
        </div>
      )}

      {/* ── IMMERSIVE EDITORIAL LIGHTBOX / THEATER VIEW (ANTI-SLOP) ── */}
      <AnimatePresence>
        {selectedTile && selectedIndex !== null && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pratinjau foto"
            className="fixed inset-0 z-[999] flex flex-col justify-between bg-black/95 p-4 sm:p-6 lg:p-8 select-none"
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
                <span className="text-fg/40">•</span>
                <span>
                  FRAME {String(selectedIndex + 1).padStart(2, '0')} /{' '}
                  {String(filteredTiles.length).padStart(2, '0')}
                </span>
              </div>

              {/* Right: Close Button */}
              <button
                type="button"
                onClick={() => setSelectedIndex(null)}
                className="group flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 font-mono text-xs uppercase tracking-wider text-muted transition-all duration-200 hover:border-accent hover:text-accent hover:bg-white/10 active:scale-95"
              >
                <span>Tutup</span>
                <span className="text-xs text-muted-dim font-mono group-hover:text-accent/70">
                  [ESC]
                </span>
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
                className="absolute left-2 sm:left-6 z-20 flex size-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-fg transition-all duration-200 hover:border-accent hover:text-accent hover:scale-110 active:scale-95"
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
                    src={getTileImageSrc(selectedTile.src)}
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
                className="absolute right-2 sm:right-6 z-20 flex size-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-fg transition-all duration-200 hover:border-accent hover:text-accent hover:scale-110 active:scale-95"
              >
                <CaretRight size={22} weight="bold" />
              </button>
            </div>

            {/* ── Bottom Bar: Sleek Editorial Caption & WhatsApp Action ── */}
            <div
              className="relative z-20 mx-auto w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-white/15 bg-[#141312]/95 px-6 py-4 shadow-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-fg">{selectedTile.title}</h3>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {captionOf(selectedTile.campus, selectedTile.alt)}
                  </p>
                </div>

                {/* Chat about this photo: only when the studio has a WhatsApp number to send it to */}
                {whatsappNumber && (
                  <a
                    href={whatsappLink(
                      whatsappNumber,
                      `Halo ${studioName}! Saya tertarik dengan konsep foto "${selectedTile.title}"${
                        selectedTile.campus ? ` di ${selectedTile.campus}` : ''
                      }. Boleh info paketnya?`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-accent px-6 text-xs font-bold uppercase tracking-wider text-accent-fg transition-colors duration-200 hover:bg-accent-light active:scale-[0.96]"
                  >
                    <WhatsappLogo size={15} weight="bold" />
                    <span>Tanya Konsep Ini</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
