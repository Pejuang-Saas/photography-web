'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { SlidersHorizontal, Sparkle } from '@phosphor-icons/react';

interface ColorGradeSliderProps {
  imageSrc?: string;
  alt?: string;
}

export default function ColorGradeSlider({
  imageSrc = '/portfolio/kayastory-22.jpg',
  alt = 'Perbandingan Color Grading Foto Wisuda Kayastory',
}: ColorGradeSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(52); // Percentage (0-100)
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
  };

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-card border border-white/10 shadow-2xl p-2 select-none group/slider transition-all duration-300 hover:border-accent/40">
      {/* Container with Pointer Drag Handler */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative aspect-[3/4] w-full cursor-ew-resize overflow-hidden rounded-xl bg-black touch-none"
      >
        {/* ── LAYER 1 (BOTTOM): RAW CAMERA FLAT PROFILE ── */}
        <div className="absolute inset-0">
          <Image
            src={imageSrc}
            alt={`${alt} - RAW Flat Profile`}
            fill
            sizes="(max-width: 1024px) 350px, 440px"
            className="object-cover filter contrast-[0.85] brightness-[0.92] saturate-[0.75]"
            priority
          />
          {/* Label RAW */}
          <div className="absolute top-3 left-3 rounded-md bg-black/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-white/70 backdrop-blur-md border border-white/10">
            RAW CAMERA PROFILE
          </div>
        </div>

        {/* ── LAYER 2 (TOP): SIGNATURE KAYASTORY 35MM COLOR GRADE ── */}
        <div
          className="absolute inset-0 will-change-[clip-path]"
          style={{
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          }}
        >
          <Image
            src={imageSrc}
            alt={`${alt} - Signature 35mm Gold Color Grade`}
            fill
            sizes="(max-width: 1024px) 350px, 440px"
            className="object-cover filter contrast-[1.05] brightness-[1.02] saturate-[1.05]"
            priority
          />
          {/* Label Signature Color Grade */}
          <div className="absolute top-3 right-3 rounded-md bg-accent/90 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-accent-fg font-bold shadow-md backdrop-blur-md flex items-center gap-1">
            <Sparkle size={10} weight="fill" />
            <span>35MM SIGNATURE GRADE</span>
          </div>
        </div>

        {/* ── SLIDER DIVIDER LINE & INTERACTIVE THUMB ── */}
        <div
          className="absolute inset-y-0 w-0.5 bg-accent z-20 pointer-events-none transition-opacity duration-200"
          style={{
            left: `${sliderPosition}%`,
            boxShadow: '0 0 12px rgba(217, 165, 33, 0.8), 0 0 2px rgba(255, 255, 255, 0.9)',
          }}
        >
          {/* Center Handle Button */}
          <div
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full border border-white/30 bg-black/85 text-accent shadow-xl backdrop-blur-md transition-transform duration-150 ${
              isDragging ? 'scale-110 border-accent bg-accent text-accent-fg' : 'group-hover/slider:scale-105'
            }`}
          >
            <SlidersHorizontal size={14} weight="bold" />
          </div>
        </div>

        {/* Subtle 35mm Corner Frame Marks */}
        <span className="absolute bottom-2 left-2 size-2 border-b-2 border-l-2 border-white/40 pointer-events-none" />
        <span className="absolute bottom-2 right-2 size-2 border-b-2 border-r-2 border-white/40 pointer-events-none" />
      </div>

      {/* Interactive Bottom Prompt */}
      <div className="px-3 py-2.5 flex items-center justify-between text-xs text-muted font-mono">
        <span className="flex items-center gap-1.5 text-[11px]">
          <span className="inline-block size-1.5 rounded-full bg-accent animate-pulse" />
          <span>GESER UNTUK MELIHAT COLOR GRADE</span>
        </span>
        <span className="text-accent font-semibold text-[10px]">UNDIP SEMARANG</span>
      </div>
    </div>
  );
}
