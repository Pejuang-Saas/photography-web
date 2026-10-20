'use client';

import { useRef, useState } from 'react';
import { ArrowRight, Check } from '@phosphor-icons/react';
import { useReducedMotion } from 'motion/react';

export interface PackageData {
  id: string;
  name: string;
  summary: string;
  price: number;
  badge?: string;
  /** The figures that matter most, shown as tiles: "90 menit", "30 foto edit". */
  stats: Array<{ value: string; label: string }>;
  /** What else the package includes, one line each. */
  lines: string[];
  /** This package's own conditions, under their own tab; no tab when there are none. */
  terms: string[];
  isFeatured: boolean;
}

interface PackageCardProps {
  pkg: PackageData;
  onSelect?: (packageId: string) => void;
}

export default function PackageCard({ pkg, onSelect }: PackageCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [tab, setTab] = useState<'details' | 'terms'>('details');
  const hasTerms = pkg.terms.length > 0;
  const shouldReduceMotion = useReducedMotion();
  const formattedPrice = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(pkg.price);

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

      <div className="relative z-10 flex flex-1 flex-col p-6 sm:p-8">
        {pkg.badge && (
          <span className="mb-3 w-fit rounded-full bg-accent px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-fg">
            {pkg.badge}
          </span>
        )}

        <h3 className="text-xl font-bold text-fg">{pkg.name}</h3>
        <p className="mt-3 flex items-baseline gap-1.5">
          <span className="text-3xl font-black tracking-tight text-accent">{formattedPrice}</span>
          <span className="text-xs text-muted">/ sesi</span>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted">{pkg.summary}</p>

        {pkg.stats.length > 0 && (
          <dl
            className="mt-6 grid gap-2.5"
            style={{ gridTemplateColumns: `repeat(${pkg.stats.length}, minmax(0, 1fr))` }}
          >
            {pkg.stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center"
              >
                <dt className="text-[10px] font-mono uppercase tracking-wider text-muted-dim">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-sm font-bold text-fg">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* Details and conditions share one tabbed area, so a card never grows when its tab changes */}
        <div className="mt-6 border-t border-white/10 pt-5">
          {hasTerms && (
            <div
              role="tablist"
              aria-label={`Informasi ${pkg.name}`}
              className="mb-5 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1"
            >
              {(
                [
                  ['details', 'Rincian'],
                  ['terms', 'Ketentuan'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                    tab === value ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="grid">
            <ul
              role="tabpanel"
              className={`col-start-1 row-start-1 space-y-2.5 ${tab === 'details' ? '' : 'invisible'}`}
              aria-hidden={tab !== 'details'}
            >
              {pkg.lines.map((feat) => (
                <li
                  key={feat}
                  className="flex items-start gap-2.5 text-xs leading-relaxed text-fg/90"
                >
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-accent/15 font-bold text-accent">
                    <Check size={10} weight="bold" />
                  </span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            {hasTerms && (
              <ul
                role="tabpanel"
                className={`col-start-1 row-start-1 space-y-3 ${tab === 'terms' ? '' : 'invisible'}`}
                aria-hidden={tab !== 'terms'}
              >
                {pkg.terms.map((term) => (
                  <li
                    key={term}
                    className="flex items-start gap-2.5 text-xs leading-relaxed text-muted"
                  >
                    <span className="mt-0.5 shrink-0 text-accent">•</span>
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Pushed to the bottom so the buttons of side-by-side cards line up */}
        <div className="mt-auto pt-6">
          {onSelect && (
            <button
              type="button"
              onClick={() => onSelect(pkg.id)}
              className={`group/btn flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.97] ${
                pkg.isFeatured
                  ? 'bg-accent text-accent-fg shadow-lg shadow-accent/20 hover:bg-accent-light'
                  : 'border border-white/15 bg-bg text-fg hover:border-accent hover:text-accent'
              }`}
            >
              <span>Pilih {pkg.name}</span>
              <span className="transition-transform duration-200 group-hover/btn:translate-x-1">
                <ArrowRight size={13} weight="bold" />
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
