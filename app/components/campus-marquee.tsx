'use client';

import { useReducedMotion } from 'motion/react';

interface CampusMarqueeProps {
  campuses: string[];
}

export default function CampusMarquee({ campuses }: CampusMarqueeProps) {
  const shouldReduceMotion = useReducedMotion();

  // Quadruple the array for an infinite loop with zero jump
  const marqueeItems = [...campuses, ...campuses, ...campuses, ...campuses];

  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-card py-3.5 backdrop-blur-xl">
      {/* Edge Linear Gradient Alpha Mask for Seamless Entrance & Exit */}
      <div
        className="w-full overflow-hidden select-none"
        style={{
          maskImage:
            'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        <div
          className={`flex w-max items-center gap-12 font-mono text-xs uppercase tracking-[0.2em] text-muted ${
            shouldReduceMotion ? '' : 'animate-ticker'
          }`}
          style={{ animationDuration: '34s' }}
        >
          {marqueeItems.map((name, idx) => (
            <span key={`${name}-${idx}`} className="flex items-center gap-6 group/item cursor-default">
              <span className="text-fg/80 font-medium transition-colors duration-200 group-hover/item:text-accent">
                {name}
              </span>
              <span className="text-accent text-sm">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
