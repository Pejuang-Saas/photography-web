'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import { ArrowRight } from '@phosphor-icons/react';
import type { LandingContent } from '@/lib/landing-content-api';

export default function HeroEntrance({
  hero,
  reservationsOpen = true,
  hasGallery = true,
}: {
  hero: LandingContent['hero'];
  /** Off: the main button leads to the catalog and says so, instead of the CMS "book" wording. */
  reservationsOpen?: boolean;
  /** The second button leads to the gallery section, which is left out when it has no photos. */
  hasGallery?: boolean;
}) {
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
      {/* Main Staggered Headline */}
      <h1 className="font-extrabold tracking-[-0.04em] text-fg">
        <motion.span
          custom={2}
          initial={shouldReduceMotion ? false : 'hidden'}
          animate="visible"
          variants={variants}
          className="block text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98]"
        >
          {hero.headlineLine1}
        </motion.span>
        <motion.span
          custom={3}
          initial={shouldReduceMotion ? false : 'hidden'}
          animate="visible"
          variants={variants}
          className="mt-2 block text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98] text-white"
        >
          {hero.headlineLine2}
        </motion.span>
        <motion.span
          custom={4}
          initial={shouldReduceMotion ? false : 'hidden'}
          animate="visible"
          variants={variants}
          className="mt-2 block text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98] text-accent"
        >
          {hero.headlineLine3}
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
        {hero.subtitle}
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
          className="group inline-flex min-h-14 items-center gap-3 rounded-full bg-accent px-8 text-xs sm:text-sm font-bold uppercase tracking-wider text-accent-fg transition-all duration-200 hover:bg-accent-light active:scale-[0.97] shadow-xl shadow-accent/15"
        >
          <span>{reservationsOpen ? hero.primaryCta : 'Lihat Paket'}</span>
          <span className="transition-transform duration-200 group-hover:translate-x-1">
            <ArrowRight size={15} weight="bold" />
          </span>
        </a>

        {hasGallery && (
          <a
            href="#portfolio"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 bg-card px-6 text-xs sm:text-sm font-semibold tracking-wide text-fg transition-colors duration-200 hover:border-white/30 hover:bg-card-hover active:scale-[0.97]"
          >
            <span>{hero.secondaryCta}</span>
          </a>
        )}
      </motion.div>
    </div>
  );
}
