'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { WhatsappLogo } from '@phosphor-icons/react';

export default function QuickBookingDock() {
  const [isVisible, setIsVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;

      // Show after scrolling past hero (300px), hide near the footer
      const isPastHero = scrollY > 320;
      const isNearBottom = scrollY + windowHeight > docHeight - 400;

      setIsVisible(isPastHero && !isNearBottom);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          className="fixed bottom-6 right-4 sm:right-6 z-40 select-none"
        >
          <div className="flex items-center gap-3 rounded-full border border-white/20 bg-[#121110]/95 p-1.5 pl-4 shadow-2xl backdrop-blur-2xl">
            {/* Studio Online Indicator */}
            <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-muted pr-1">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-fg font-medium">Slot Wisuda 2026</span>
            </div>

            {/* Quick Action Button with WhatsApp Green Accent & Haptic Feedback */}
            <a
              href="https://wa.me/?text=Halo%20Kayastory!%20Saya%20ingin%20tanya%20jadwal%20dan%20paket%20foto%20wisuda"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-accent-fg transition-all duration-200 hover:bg-accent-light active:scale-[0.96] shadow-lg shadow-accent/25"
            >
              <WhatsappLogo size={16} weight="bold" />
              <span>Tanya Jadwal</span>
              <span className="font-mono text-xs transition-transform duration-200 group-hover:translate-x-0.5">
                ↗
              </span>
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
