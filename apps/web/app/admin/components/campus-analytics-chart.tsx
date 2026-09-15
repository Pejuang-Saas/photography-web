'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

const campusData = [
  { campus: 'Undip', clients: 44, fullName: 'Universitas Diponegoro' },
  { campus: 'Unnes', clients: 26, fullName: 'Universitas Negeri Semarang' },
  { campus: 'Udinus', clients: 16, fullName: 'Universitas Dian Nuswantoro' },
  { campus: 'Polines', clients: 12, fullName: 'Politeknik Negeri Semarang' },
  { campus: 'Unika', clients: 8, fullName: 'SCU Soegijapranata' },
  { campus: 'UIN', clients: 6, fullName: 'UIN Walisongo' },
];

export function CampusAnalyticsChart() {
  const [mounted, setMounted] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card className="rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
      <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <GraduationCap className="size-4 text-amber-500" />
              Sebaran Klien Kampus
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              Total wisudawan terdaftar di Semarang
            </CardDescription>
          </div>
          <span className="text-[11px] font-mono font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
            6 Universitas
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 pb-2">
        <div className="h-56 w-full min-h-[220px]">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <BarChart
                data={campusData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onMouseMove={(state) => {
                  if (state && typeof state.activeTooltipIndex === 'number') {
                    setHoverIndex(state.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-zinc-100 dark:stroke-zinc-800" />
                <XAxis
                  dataKey="campus"
                  axisLine={false}
                  tickLine={false}
                  className="text-[11px] fill-zinc-600 dark:fill-zinc-400 font-semibold"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  className="text-[11px] fill-zinc-500 font-mono"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 p-3 shadow-xl backdrop-blur-md text-xs">
                          <p className="font-bold text-zinc-900 dark:text-white">{item.fullName}</p>
                          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                            Total Klien:{' '}
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                              {item.clients} Orang
                            </span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="clients" radius={[6, 6, 0, 0]}>
                  {campusData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={hoverIndex === index ? '#d97706' : index === 0 ? '#f59e0b' : '#3f3f46'}
                      className="transition-colors duration-200 cursor-pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-400">
              Memuat grafik kampus...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
