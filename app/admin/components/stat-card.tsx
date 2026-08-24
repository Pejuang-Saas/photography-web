'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  variant?: 'emerald' | 'amber' | 'indigo' | 'rose';
}

export default function StatCard({
  title,
  value,
  subtitle,
  change,
  isPositive = true,
  icon: Icon,
  variant = 'amber',
}: StatCardProps) {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'indigo':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'rose':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
  };

  return (
    <Card className="rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 p-4 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {title}
          </span>
          <div className={`flex size-8 items-center justify-center rounded-lg border ${getBadgeStyle()}`}>
            <Icon className="size-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-mono">
            {value}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            {change && (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${
                  isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {change}
              </span>
            )}
            <span className="text-zinc-500 text-[11px] truncate">{subtitle}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
