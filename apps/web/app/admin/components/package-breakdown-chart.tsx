'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera } from 'lucide-react';

const packageData = [
  { name: 'Squad Circle', value: 164, color: '#d97706' },
  { name: 'Solo Kebaya', value: 142, color: '#f59e0b' },
  { name: 'Duo Bestie', value: 98, color: '#fbbf24' },
  { name: 'Family Portrait', value: 87, color: '#71717a' },
  { name: '35mm Film', value: 54, color: '#a1a1aa' },
];

export function PackageBreakdownChart() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card className="rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm flex flex-col justify-between">
      <CardHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
        <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
          <Camera className="size-4 text-amber-500" />
          Paket Terfavorit
        </CardTitle>
        <CardDescription className="text-xs text-zinc-500">
          Persentase pilihan paket photoshoot wisuda
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4 pb-3">
        <div className="h-44 w-full min-h-[170px]">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={160}>
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      return (
                        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 p-2.5 shadow-xl backdrop-blur-md text-xs">
                          <p className="font-bold text-zinc-900 dark:text-white">{data.name}</p>
                          <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {data.value} Sesi Pemotretan
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie
                  data={packageData}
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {packageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-400">
              Memuat data paket...
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 pt-3 text-[11px] border-t border-zinc-100 dark:border-zinc-800">
          {packageData.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
