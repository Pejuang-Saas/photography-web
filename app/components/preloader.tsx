'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

const CRITICAL_IMAGES = [
  '/portfolio/kayastory-01.jpg',
  '/portfolio/kayastory-02.jpg',
  '/portfolio/kayastory-03.jpg',
  '/portfolio/kayastory-04.jpg',
  '/portfolio/kayastory-05.jpg',
  '/portfolio/kayastory-06.jpg',
  '/portfolio/kayastory-07.jpg',
  '/portfolio/kayastory-08.jpg',
  '/portfolio/kayastory-11.jpg',
  '/portfolio/kayastory-12.jpg',
  '/portfolio/kayastory-14.jpg',
  '/portfolio/kayastory-16.jpg',
  '/portfolio/kayastory-18.jpg',
  '/portfolio/kayastory-19.jpg',
  '/portfolio/kayastory-21.jpg',
  '/portfolio/kayastory-22.jpg',
];

interface PreloaderProps {
  onComplete?: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    let loadedCount = 0;
    const totalImages = CRITICAL_IMAGES.length;
    const startTime = Date.now();
    const minDisplayMs = 700;

    const updateProgress = () => {
      loadedCount++;
      const currentPct = Math.round((loadedCount / totalImages) * 100);
      setProgress((prev) => Math.max(prev, currentPct));

      if (loadedCount >= totalImages) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDisplayMs - elapsed);

        setTimeout(() => {
          setIsLoaded(true);
          onComplete?.();
        }, remaining);
      }
    };

    CRITICAL_IMAGES.forEach((src) => {
      const img = new window.Image();
      img.src = src;
      img.onload = updateProgress;
      img.onerror = updateProgress;
    });

    const failsafe = setTimeout(() => {
      setProgress(100);
      setIsLoaded(true);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(failsafe);
  }, [onComplete]);

  // Lock body scroll while loading
  useEffect(() => {
    if (!isLoaded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLoaded]);

  return (
    <AnimatePresence>
      {!isLoaded && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  y: -16,
                  transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] },
                }
          }
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#070707] select-none text-fg"
        >
          {/* Simple Clean Brand Preloader */}
          <div className="flex flex-col items-center justify-center text-center">
            <motion.h1
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-3xl sm:text-4xl font-black tracking-tighter text-fg"
            >
              KAYASTORY<span className="text-accent">.</span>
            </motion.h1>

            {/* Subtle Minimalist Line & Counter */}
            <div className="mt-5 flex items-center gap-3">
              <div className="h-[1.5px] w-28 sm:w-32 overflow-hidden bg-white/10 rounded-full">
                <motion.div
                  className="h-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                />
              </div>
              <span className="font-mono text-[11px] text-muted-dim tracking-wider tabular-nums w-8 text-left">
                {progress}%
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
