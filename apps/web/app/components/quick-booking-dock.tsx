'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { WhatsappLogo } from '@phosphor-icons/react';
import { whatsappLink } from '@/lib/format';

export default function QuickBookingDock({
  whatsappNumber = null,
  studioName = 'Kayastory',
}: {
  whatsappNumber?: string | null;
  studioName?: string;
}) {
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

  // Without a WhatsApp number there is nowhere for the button to go.
  if (!whatsappNumber) return null;

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
          <div className="flex items-center gap-3 rounded-full border border-white/20 bg-[#121110] p-1.5 pl-4">
            <span className="hidden text-xs font-medium text-fg sm:inline">Slot Wisuda 2026</span>

            <a
              href={whatsappLink(
                whatsappNumber,
                `Halo ${studioName}! Saya ingin tanya jadwal dan paket foto wisuda`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-xs font-bold uppercase tracking-wider text-accent-fg transition-colors duration-200 hover:bg-accent-light active:scale-[0.96]"
            >
              <WhatsappLogo size={16} weight="bold" />
              <span>Tanya Jadwal</span>
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
