'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import { ArrowRight } from '@phosphor-icons/react';

export default function HeroEntrance() {
  const shouldReduceMotion = useReducedMotion();

  const variants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: custom * 0.1,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    }),
  };

  return (
    <div className="lg:col-span-7 z-10">
      {/* Eyebrow Badge */}
      <motion.div
        custom={1}
        initial={shouldReduceMotion ? false : 'hidden'}
        animate="visible"
        variants={variants}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-card px-4 py-1.5 text-xs text-muted font-mono tracking-wider uppercase shadow-sm">
          Semarang, Jawa Tengah • Wisuda 2026
        </span>
      </motion.div>

      {/* Main Staggered Headline */}
      <h1 className="mt-8 font-extrabold tracking-[-0.04em] text-fg">
        <motion.span
          custom={2}
          initial={shouldReduceMotion ? false : 'hidden'}
          animate="visible"
          variants={variants}
          className="block text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98]"
        >
          Hari ini berlalu cepat,
        </motion.span>
        <motion.span
          custom={3}
          initial={shouldReduceMotion ? false : 'hidden'}
          animate="visible"
          variants={variants}
          className="mt-2 block text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98] text-white"
        >
          sebuah frame
        </motion.span>
        <motion.span
          custom={4}
          initial={shouldReduceMotion ? false : 'hidden'}
          animate="visible"
          variants={variants}
          className="mt-2 block text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98] text-accent"
        >
          membuatnya abadi.
        </motion.span>
      </h1>

      {/* Subtitle Description */}
      <motion.p
        custom={5}
        initial={shouldReduceMotion ? false : 'hidden'}
        animate="visible"
        variants={variants}
        className="mt-7 max-w-xl text-base sm:text-lg leading-relaxed text-muted font-normal"
      >
        Spesialis fotografi wisuda di Semarang. Mengabadikan momen kelulusan,
        kebaya, dan kebersamaan sahabat dalam estetika warna yang abadi.
      </motion.p>

      {/* Action Buttons */}
      <motion.div
        custom={6}
        initial={shouldReduceMotion ? false : 'hidden'}
        animate="visible"
        variants={variants}
        className="mt-10 flex flex-wrap items-center gap-4"
      >
        <a
          href="#paket"
          className="group inline-flex items-center gap-3 rounded-full bg-accent px-8 py-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-accent-fg transition-all duration-200 hover:bg-accent-light active:scale-[0.97] shadow-xl shadow-accent/15"
        >
          <span>Reservasi Sekarang</span>
          <span className="transition-transform duration-200 group-hover:translate-x-1">
            <ArrowRight size={15} weight="bold" />
          </span>
        </a>

        <a
          href="#portfolio"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-card px-6 py-4 text-xs sm:text-sm font-semibold tracking-wide text-fg transition-all duration-200 hover:border-white/30 hover:bg-card-hover active:scale-[0.97]"
        >
          <span>Lihat Galeri Foto</span>
        </a>
      </motion.div>
    </div>
  );
}
