'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { List, X } from '@phosphor-icons/react';

export interface NavLink {
  href: string;
  label: string;
  idx: string;
}

interface HeaderViewfinderProps {
  navLinks: NavLink[];
}

export default function HeaderViewfinder({ navLinks }: HeaderViewfinderProps) {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:pt-6 pointer-events-none">
      <div className="mx-auto max-w-7xl relative pointer-events-auto">
        {/* Viewfinder Outer Shell with Optical Corner Brackets */}
        <motion.div
          initial={shouldReduceMotion ? false : { y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className={`relative rounded-2xl border bg-bg/90 px-6 py-3.5 backdrop-blur-2xl transition-all duration-300 flex items-center justify-between ${
            scrolled
              ? 'border-white/15 bg-bg/95 shadow-2xl shadow-black/80'
              : 'border-white/10 shadow-xl shadow-black/40'
          }`}
        >
          {/* Viewfinder Optical Corner Notches (Camera Focus Lock) */}
          <motion.span
            initial={shouldReduceMotion ? false : { scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -top-1 -left-1 size-2 border-t-2 border-l-2 border-accent"
          />
          <motion.span
            initial={shouldReduceMotion ? false : { scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -top-1 -right-1 size-2 border-t-2 border-r-2 border-accent"
          />
          <motion.span
            initial={shouldReduceMotion ? false : { scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -bottom-1 -left-1 size-2 border-b-2 border-l-2 border-accent"
          />
          <motion.span
            initial={shouldReduceMotion ? false : { scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -bottom-1 -right-1 size-2 border-b-2 border-r-2 border-accent"
          />

          {/* Left: Brand & Optical Focal Spec */}
          <a
            href="#top"
            className="group flex items-center gap-3 text-fg active:scale-95 transition-transform duration-150"
          >
            <span className="text-lg sm:text-xl font-black tracking-tighter">
              KAYASTORY<span className="text-accent">.</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted">
              <span>35MM</span>
              <span className="text-accent">•</span>
              <span>F/1.4</span>
            </span>
          </a>

          {/* Center: Rangefinder Navigation with Sliding Hover Pill */}
          <nav
            onMouseLeave={() => setHoveredLink(null)}
            className="hidden lg:flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted p-1"
          >
            {navLinks.map((l) => {
              const isHovered = hoveredLink === l.href;

              return (
                <a
                  key={l.href}
                  href={l.href}
                  onMouseEnter={() => setHoveredLink(l.href)}
                  className={`relative px-3.5 py-1.5 transition-colors duration-200 ${
                    isHovered ? 'text-fg' : 'text-muted hover:text-fg'
                  }`}
                >
                  {isHovered && (
                    <motion.span
                      layoutId="headerHoverPill"
                      className="absolute inset-0 rounded-lg bg-white/10 -z-0"
                      transition={{
                        type: 'spring',
                        duration: shouldReduceMotion ? 0 : 0.3,
                        bounce: 0.1,
                      }}
                    />
                  )}
                  <span className="relative z-10">{l.label}</span>
                </a>
              );
            })}
          </nav>

          {/* Right: Shutter Release Button & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <span className="hidden md:inline-block font-mono text-[10px] uppercase tracking-wider text-muted-dim">
              EXP // 2026
            </span>

            <a
              href="#paket"
              className="group inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-accent-fg transition-all duration-200 hover:bg-accent-light active:scale-[0.96] shadow-sm"
            >
              <span>Reservasi</span>
              <span className="font-mono text-xs transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                ↗
              </span>
            </a>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigasi"
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-card text-fg transition-colors duration-200 hover:border-accent hover:text-accent lg:hidden active:scale-95"
            >
              {mobileMenuOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
            </button>
          </div>
        </motion.div>

        {/* ── MOBILE DRAWER MENU (Animated) ── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="absolute right-0 top-16 w-64 rounded-2xl border border-white/15 bg-[#100f0e]/95 p-4 shadow-2xl backdrop-blur-2xl lg:hidden"
            >
              <div className="flex flex-col space-y-1">
                {navLinks.map((l, i) => (
                  <motion.a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 + 0.05, duration: 0.2 }}
                    className="flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-mono uppercase tracking-wider text-muted hover:text-fg hover:bg-white/5 transition-colors active:scale-[0.98]"
                  >
                    <span>{l.label}</span>
                    <span className="text-[10px] text-accent font-mono">0{i + 1}</span>
                  </motion.a>
                ))}

                <a
                  href="#paket"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-3 block rounded-xl bg-accent px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-accent-fg transition-colors hover:bg-accent-light active:scale-[0.97]"
                >
                  Reservasi Sekarang
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
