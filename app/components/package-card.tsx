'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Check } from '@phosphor-icons/react';
import { useReducedMotion } from 'motion/react';

export interface PackageData {
  name: string;
  cover: string;
  summary: string;
  price: string;
  badge?: string;
  features: string[];
  isFeatured: boolean;
}

interface PackageCardProps {
  pkg: PackageData;
}

export default function PackageCard({ pkg }: PackageCardProps) {
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
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl bg-card transition-all duration-300 ${
        pkg.isFeatured
          ? 'border-2 border-accent shadow-2xl shadow-accent/15'
          : 'border border-white/10 hover:border-white/25 shadow-lg'
      }`}
    >
      {/* Interactive Cursor Spotlight Glow */}
      {!shouldReduceMotion && isHovered && (
        <div
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-100 transition-opacity duration-300 -z-0"
          style={{
            background: `radial-gradient(400px circle at ${mousePosition.x}px ${
              mousePosition.y
            }px, ${
              pkg.isFeatured ? 'rgba(217, 165, 33, 0.15)' : 'rgba(255, 255, 255, 0.06)'
            }, transparent 80%)`,
          }}
        />
      )}

      {/* Photo Cover on Top with Viewfinder frame */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black z-10">
        <Image
          src={`/portfolio/kayastory-${pkg.cover}.jpg`}
          alt={`Cover Paket ${pkg.name}`}
          fill
          sizes="(max-width: 1024px) 400px, 450px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {pkg.badge && (
          <span className="absolute top-3 right-3 rounded-full bg-accent px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-fg shadow-lg">
            {pkg.badge}
          </span>
        )}

        {/* Subtle camera optical tag */}
        <div className="absolute bottom-2 left-3 rounded bg-black/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80 backdrop-blur-md">
          <span>FRAME #{pkg.cover}</span>
        </div>
      </div>

      {/* Package Content */}
      <div className="p-6 sm:p-7 flex flex-col flex-1 relative z-10">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xl font-bold text-fg group-hover:text-white transition-colors">
            {pkg.name}
          </h3>
          <span className="text-xl font-black text-accent tracking-tight">
            {pkg.price}
          </span>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-muted">
          {pkg.summary}
        </p>

        {/* Features List */}
        <div className="mt-6 border-t border-white/10 pt-5 flex-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-dim block mb-3">
            Rincian Paket:
          </span>
          <ul className="space-y-2.5">
            {pkg.features.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-fg/90">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent mt-0.5 font-bold">
                  <Check size={10} weight="bold" />
                </span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button with Nested Arrow Hover Physics */}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            `Halo Kayastory! Saya tertarik reservasi ${pkg.name} untuk wisuda.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`group/btn mt-7 flex items-center justify-center gap-2 rounded-full py-3.5 px-6 text-center text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.97] ${
            pkg.isFeatured
              ? 'bg-accent text-accent-fg hover:bg-accent-light shadow-lg shadow-accent/20'
              : 'border border-white/15 bg-bg text-fg hover:border-accent hover:text-accent'
          }`}
        >
          <span>Pilih {pkg.name}</span>
          <span className="transition-transform duration-200 group-hover/btn:translate-x-1">
            <ArrowRight size={13} weight="bold" />
          </span>
        </a>
      </div>
    </div>
  );
}
