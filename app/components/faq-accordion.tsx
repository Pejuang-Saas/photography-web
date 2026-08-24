'use client';

import { useState } from 'react';

export interface FAQItem {
  q: string;
  a: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <div className="divide-y divide-white/10 border-y border-white/10">
      {items.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div key={item.q} className="py-1">
            <button
              type="button"
              onClick={() => toggleIndex(index)}
              aria-expanded={isOpen}
              className="group flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left font-bold text-base sm:text-lg text-fg transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent select-none"
            >
              <div className="flex items-baseline gap-4 pr-4">
                <span
                  className={`font-mono text-xs font-normal transition-colors duration-200 ${
                    isOpen ? 'text-accent font-semibold' : 'text-muted-dim group-hover:text-accent/80'
                  }`}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  className={`transition-colors duration-200 ${
                    isOpen ? 'text-accent' : 'text-fg group-hover:text-accent'
                  }`}
                >
                  {item.q}
                </span>
              </div>

              {/* Native GPU-accelerated Rotatable + icon indicator */}
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold shadow-sm transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  isOpen
                    ? 'rotate-45 bg-accent border-accent text-accent-fg shadow-accent/20'
                    : 'rotate-0 bg-card border-white/10 text-accent hover:border-accent'
                }`}
              >
                +
              </span>
            </button>

            {/* ── Native 120 FPS CSS Grid Smooth Expansion (Zero JS Measurement Jank) ── */}
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden min-h-0">
                <div
                  className={`transition-all duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    isOpen
                      ? 'opacity-100 translate-y-0 pb-5 pt-1'
                      : 'opacity-0 -translate-y-1.5 pb-0 pt-0'
                  }`}
                >
                  <p className="pl-8 text-xs sm:text-sm leading-relaxed text-muted max-w-2xl">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
