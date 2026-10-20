'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { SlidersHorizontal } from '@phosphor-icons/react';

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

  // The same moves as dragging, for keyboard and screen reader users.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 4;
    const moves: Record<string, number> = {
      ArrowLeft: sliderPosition - step,
      ArrowDown: sliderPosition - step,
      ArrowRight: sliderPosition + step,
      ArrowUp: sliderPosition + step,
      Home: 5,
      End: 95,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    setSliderPosition(Math.max(5, Math.min(95, moves[e.key])));
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
        onKeyDown={handleKeyDown}
        role="slider"
        tabIndex={0}
        aria-label="Perbandingan foto sebelum dan sesudah color grade"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(sliderPosition)}
        aria-valuetext={`Tampilan color grade ${Math.round(sliderPosition)} persen`}
        className="relative aspect-[3/4] w-full cursor-ew-resize overflow-hidden rounded-xl bg-black touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
          <div className="absolute top-3 left-3 rounded-md bg-black/80 px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-white/80 border border-white/10">
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
          <div className="absolute top-3 right-3 rounded-md bg-accent px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-accent-fg font-bold">
            <span>35MM SIGNATURE GRADE</span>
          </div>
        </div>

        {/* ── SLIDER DIVIDER LINE & INTERACTIVE THUMB ── */}
        <div
          className="absolute inset-y-0 w-0.5 bg-accent z-20 pointer-events-none transition-opacity duration-200"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Center Handle Button */}
          <div
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full border border-white/30 bg-black text-accent transition-transform duration-150 ${
              isDragging
                ? 'scale-110 border-accent bg-accent text-accent-fg'
                : 'group-hover/slider:scale-105'
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
        <span>Geser atau gunakan tombol panah untuk melihat color grade</span>
        <span className="font-semibold text-fg/80">UNDIP SEMARANG</span>
      </div>
    </div>
  );
}
