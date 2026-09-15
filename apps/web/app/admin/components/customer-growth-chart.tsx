'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatRupiah } from '@/lib/mock-data';
import { TrendingUp } from 'lucide-react';

const monthlyData = [
  { month: 'Jan', bookings: 14, revenue: 8400000 },
  { month: 'Feb', bookings: 19, revenue: 12200000 },
  { month: 'Mar', bookings: 28, revenue: 17800000 },
  { month: 'Apr', bookings: 22, revenue: 14500000 },
  { month: 'Mei', bookings: 35, revenue: 23600000 },
  { month: 'Jun', bookings: 31, revenue: 20100000 },
  { month: 'Jul', bookings: 42, revenue: 27900000 },
  { month: 'Ags', bookings: 48, revenue: 32650000 },
];

export function CustomerGrowthChart() {
  const [metric, setMetric] = useState<'revenue' | 'bookings'>('revenue');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card className="rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-2 border-b border-zinc-100 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white">
              Tren Pertumbuhan & Omset
            </CardTitle>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-3" /> +18.4%
            </span>
          </div>
          <CardDescription className="text-xs text-zinc-500 mt-0.5">
            Grafik pemesanan photoshoot wisuda periode 2026
          </CardDescription>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
              metric === 'revenue'
                ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Omset (IDR)
          </button>
          <button
            type="button"
            onClick={() => setMetric('bookings')}
            className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
              metric === 'bookings'
                ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Jumlah Sesi
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-5 pb-2">
        <div className="h-64 w-full min-h-[250px]">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="cohesiveAmberGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-zinc-100 dark:stroke-zinc-800" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  className="text-[11px] fill-zinc-500 font-medium"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => (metric === 'revenue' ? `${val / 1000000}jt` : `${val}`)}
                  className="text-[11px] fill-zinc-500 font-mono"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 p-3 shadow-xl backdrop-blur-md text-xs">
                          <p className="font-bold text-zinc-900 dark:text-white">Bulan {label} 2026</p>
                          <div className="mt-1.5 space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-zinc-500 dark:text-zinc-400">Total Omset:</span>
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                {formatRupiah(data.revenue)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-zinc-500 dark:text-zinc-400">Total Sesi:</span>
                              <span className="font-mono font-bold text-zinc-900 dark:text-white">
                                {data.bookings} Klien
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#cohesiveAmberGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-400">
              Memuat grafik...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
