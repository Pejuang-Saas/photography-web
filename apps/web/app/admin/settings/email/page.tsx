'use client';

import { useState } from 'react';
import { History, LayoutTemplate, SlidersHorizontal } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmailHistoryTab from './components/email-history-tab';
import EmailSettingsTab from './components/email-settings-tab';
import EmailTemplatesTab from './components/email-templates-tab';

const TAB_CLASS =
  'gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold text-zinc-700 transition-all hover:text-zinc-900 data-active:bg-white data-active:text-amber-600 data-active:shadow-sm dark:text-zinc-400 dark:hover:text-white dark:data-active:bg-zinc-800 dark:data-active:text-amber-400';

export default function EmailNotificationsPage() {
  const [tab, setTab] = useState('settings');

  return (
    <div className="space-y-7">
      <div className="border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80">
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
          Notifikasi Email
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
          Atur kapan email dikirim ke customer, ubah isi template, dan pantau email yang sudah
          keluar.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex w-full items-center gap-1.5 rounded-xl border border-zinc-300/80 bg-zinc-200/70 p-1.5 group-data-horizontal/tabs:h-14 dark:border-zinc-800 dark:bg-zinc-900 sm:w-fit">
          <TabsTrigger value="settings" className={TAB_CLASS}>
            <SlidersHorizontal className="size-3.5" />
            Pengaturan
          </TabsTrigger>
          <TabsTrigger value="templates" className={TAB_CLASS}>
            <LayoutTemplate className="size-3.5" />
            Template
          </TabsTrigger>
          <TabsTrigger value="history" className={TAB_CLASS}>
            <History className="size-3.5" />
            Riwayat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="pt-6">
          <EmailSettingsTab />
        </TabsContent>
        <TabsContent value="templates" className="pt-6">
          <EmailTemplatesTab />
        </TabsContent>
        <TabsContent value="history" className="pt-6">
          <EmailHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
