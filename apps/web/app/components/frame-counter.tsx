'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Aperture } from '@phosphor-icons/react';

const SECTIONS = [
  { id: 'top', label: 'HERO', num: '01' },
  { id: 'portfolio', label: 'KATALOG', num: '02' },
  { id: 'tentang', label: 'STUDIO', num: '03' },
  { id: 'paket', label: 'PAKET', num: '04' },
  { id: 'alur', label: 'ALUR', num: '05' },
  { id: 'testimoni', label: 'TESTIMONI', num: '06' },
  { id: 'faq', label: 'FAQ', num: '07' },
];

export default function FrameCounter() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0]);
  const [isVisible, setIsVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsVisible(scrollY > 200);

      const sectionElements = SECTIONS.map((sec) => ({
        ...sec,
        element: document.getElementById(sec.id),
      }));

      const current = sectionElements.find((sec) => {
        if (!sec.element) return false;
        const rect = sec.element.getBoundingClientRect();
        return rect.top <= 250 && rect.bottom >= 250;
      });

      if (current) {
        setActiveSection(current);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="fixed bottom-6 left-6 z-40 hidden md:flex items-center gap-3 rounded-full border border-white/15 bg-black/80 px-4 py-2 text-xs font-mono backdrop-blur-xl shadow-2xl"
    >
      <div className="flex items-center gap-2 text-accent">
        <Aperture size={15} weight="bold" className="animate-spin" style={{ animationDuration: '20s' }} />
        <span className="font-bold">EXP // {activeSection.num}</span>
      </div>

      <span className="text-white/20">•</span>

      <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
        {activeSection.label}
      </span>
    </motion.div>
  );
}
