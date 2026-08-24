'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Star, Camera } from '@phosphor-icons/react';
import { useReducedMotion } from 'motion/react';

export interface TestimonialStory {
  quote: string;
  author: string;
  campus: string;
  photo: string;
}

interface TestimonialCardProps {
  story: TestimonialStory;
}

export default function TestimonialCard({ story }: TestimonialCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-card transition-all duration-300 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5 flex flex-col md:flex-row"
    >
      {/* Interactive Ambient Spotlight Glow */}
      {!shouldReduceMotion && isHovered && (
        <div
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-100 transition-opacity duration-300 -z-0"
          style={{
            background: `radial-gradient(500px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(217, 165, 33, 0.08), transparent 80%)`,
          }}
        />
      )}

      {/* Left: Large Photo (38%) with 35mm Frame Notches */}
      <div className="relative aspect-[4/3] md:aspect-auto md:w-[38%] min-h-[260px] overflow-hidden bg-black shrink-0 z-10">
        <Image
          src={`/portfolio/kayastory-${story.photo}.jpg`}
          alt={`Foto Sesi Wisuda ${story.author}`}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* 35mm Optical Watermark */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80 backdrop-blur-md">
          <Camera size={11} className="text-accent" />
          <span>FRAME #{story.photo}</span>
        </div>
      </div>

      {/* Right: Editorial Quote Block (62%) */}
      <div className="p-8 sm:p-10 flex flex-col justify-between flex-1 relative z-10">
        <div>
          <span className="text-3xl sm:text-4xl font-serif text-accent leading-none block mb-4 transition-transform duration-300 group-hover:scale-110 origin-left">
            “
          </span>
          <blockquote className="text-base sm:text-xl font-bold leading-snug text-fg tracking-tight group-hover:text-white transition-colors">
            {story.quote}
          </blockquote>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
          <div>
            <span className="block font-mono text-xs font-bold uppercase tracking-wider text-fg group-hover:text-accent transition-colors">
              {story.author}
            </span>
            <span className="block text-xs text-muted mt-0.5">
              {story.campus}
            </span>
          </div>

          {/* Gold Rating Stars */}
          <div className="flex items-center gap-1 text-accent">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} weight="fill" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
