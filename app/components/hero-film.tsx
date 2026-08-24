'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

interface HeroFilmProps {
  stripA?: string[];
  stripB?: string[];
}

const DEFAULT_STRIP_A = ['01', '03', '06', '07', '11', '14'];
const DEFAULT_STRIP_B = ['16', '18', '19', '21', '22', '02'];

export default function HeroFilm({
  stripA = DEFAULT_STRIP_A,
  stripB = DEFAULT_STRIP_B,
}: HeroFilmProps) {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // Spring physics for subtle interactive 3D perspective tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(mouseY, { stiffness: 90, damping: 22 });
  const rotateY = useSpring(mouseX, { stiffness: 90, damping: 22 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x * 6); // Max 3deg subtle tilt
    mouseY.set(-y * 6);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // 2 sets of frames for seamless CSS translateY(-50%) loop
  const loopA = [...stripA, ...stripA];
  const loopB = [...stripB, ...stripB];

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...(shouldReduceMotion
          ? {}
          : {
              rotateX,
              rotateY,
              transformPerspective: 1000,
            }),
        maskImage:
          'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
      }}
      className="relative flex items-center justify-center gap-4 lg:gap-6 overflow-hidden h-[540px] md:h-[620px] lg:h-[680px] w-full max-w-[480px] select-none py-2"
    >
      {/* Subtle ambient backlight */}
      <div className="absolute inset-0 bg-accent/5 blur-3xl pointer-events-none -z-10" />

      {/* ── FILM STRIP 1 (Infinite Scroll UP) ── */}
      <div className="relative overflow-hidden w-[165px] sm:w-[195px] lg:w-[210px] -rotate-2 shrink-0 transition-transform duration-300 hover:rotate-0">
        <div
          className={`film-strip-body rounded-2xl p-2 flex flex-col will-change-transform ${
            shouldReduceMotion ? '' : 'animate-film-up'
          }`}
          style={{ animationDuration: '28s' }}
        >
          {loopA.map((frame, i) => (
            <div key={`stripA-${frame}-${i}`} className="flex flex-col my-2 first:mt-0 last:mb-0">
              {/* Top Film Frame Marker */}
              <div className="flex items-center justify-between px-2 py-0.5 text-[9px] font-mono text-accent/70 tracking-widest uppercase">
                <span>KAYASTORY</span>
                <span>▲ {String((i % stripA.length) + 1).padStart(2, '0')}</span>
              </div>

              {/* Photo with 35mm Sprocket Holes */}
              <div className="flex items-stretch bg-black rounded-lg overflow-hidden border border-white/5 shadow-inner">
                <div className="sprocket-vertical" />
                <div className="relative aspect-[4/5] flex-1 overflow-hidden group/frame">
                  <Image
                    src={`/portfolio/kayastory-${frame}.jpg`}
                    alt={`Foto Wisuda #${frame}`}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover/frame:scale-105"
                    sizes="(max-width: 640px) 160px, 210px"
                  />
                </div>
                <div className="sprocket-vertical" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FILM STRIP 2 (Infinite Scroll DOWN) ── */}
      <div className="relative overflow-hidden w-[165px] sm:w-[195px] lg:w-[210px] rotate-2 hidden sm:block shrink-0 transition-transform duration-300 hover:rotate-0">
        <div
          className={`film-strip-body rounded-2xl p-2 flex flex-col will-change-transform ${
            shouldReduceMotion ? '' : 'animate-film-down'
          }`}
          style={{ animationDuration: '32s' }}
        >
          {loopB.map((frame, i) => (
            <div key={`stripB-${frame}-${i}`} className="flex flex-col my-2 first:mt-0 last:mb-0">
              {/* Top Film Frame Marker */}
              <div className="flex items-center justify-between px-2 py-0.5 text-[9px] font-mono text-accent/70 tracking-widest uppercase">
                <span>ARCHIVE</span>
                <span>▲ {String((i % stripB.length) + 13).padStart(2, '0')}</span>
              </div>

              {/* Photo with 35mm Sprocket Holes */}
              <div className="flex items-stretch bg-black rounded-lg overflow-hidden border border-white/5 shadow-inner">
                <div className="sprocket-vertical" />
                <div className="relative aspect-[4/5] flex-1 overflow-hidden group/frame">
                  <Image
                    src={`/portfolio/kayastory-${frame}.jpg`}
                    alt={`Foto Wisuda #${frame}`}
                    fill
                    className="object-cover transition-transform duration-700 group-hover/frame:scale-105"
                    sizes="(max-width: 640px) 160px, 210px"
                  />
                </div>
                <div className="sprocket-vertical" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
