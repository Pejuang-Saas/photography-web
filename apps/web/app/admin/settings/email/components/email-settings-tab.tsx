'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Save, Send, Server } from 'lucide-react';
import { errorMessage, useStudioSettings } from '@/lib/admin-queries';
import type { EmailSettings } from '@/lib/email-api';
import { useEmailSettings, useSendTestEmail, useUpdateEmailSettings } from '@/lib/email-queries';
import { FormField } from '../../../components/form-field';
import { QueryError, QueryLoading } from '../../../components/query-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const CARD =
  'rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60';
const CARD_HEAD = 'border-b border-zinc-100 pb-4 dark:border-zinc-800/80';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ToggleRow({
  id,
  title,
  description,
  checked,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <h3 id={id} className="text-sm font-semibold text-zinc-900 dark:text-white">
          {title}
        </h3>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span
          className={`text-xs font-semibold ${
            checked ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'
          }`}
        >
          {checked ? 'Aktif' : 'Mati'}
        </span>
        <Switch checked={checked} onCheckedChange={onChange} aria-labelledby={id} />
      </div>
    </div>
  );
}

function SmtpStatusCard({ smtp }: { smtp: EmailSettings['smtp'] }) {
  return (
    <Card className={CARD}>
      <CardHeader className={CARD_HEAD}>
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Server className="size-4 text-amber-500" />
          Server Email (SMTP)
        </CardTitle>
        <CardDescription className="text-xs">
          Diatur oleh developer lewat environment server, jadi tidak bisa diubah dari sini.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        {smtp.configured ? (
          <div className="space-y-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              Sudah dikonfigurasi
            </p>
            <dl className="grid gap-x-6 gap-y-4 text-xs sm:grid-cols-2">
              {[
                ['Server', `${smtp.host}:${smtp.port}`],
                [
                  'Pengirim',
                  smtp.fromName ? `${smtp.fromName}\n${smtp.fromEmail}` : smtp.fromEmail,
                ],
                ['Autentikasi', smtp.authenticated ? 'Memakai username & password' : 'Tanpa login'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="mt-0.5 whitespace-pre-line break-words font-mono font-medium text-zinc-900 dark:text-zinc-100">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-[11px] text-zinc-500">
              Status ini hanya memeriksa kelengkapan konfigurasi. Gunakan kirim email tes untuk
              memastikan server benar-benar menerima email.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="size-4" />
              Belum dikonfigurasi, email belum bisa dikirim
            </p>
            <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              Minta developer melengkapi environment server berikut, lalu restart API dan worker:
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {smtp.missing.map((name) => (
                <code
                  key={name}
                  className="rounded-md bg-zinc-900/90 px-2 py-1 text-[11px] text-amber-300"
                >
                  {name}
                </code>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SwitchesCard({ settings }: { settings: EmailSettings }) {
  const update = useUpdateEmailSettings();
  const saved = { enabled: settings.enabled, autoSendInvoice: settings.autoSendInvoice };
  const [draft, setDraft] = useState(saved);
  const set = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }));
  const dirty = draft.enabled !== saved.enabled || draft.autoSendInvoice !== saved.autoSendInvoice;

  return (
    <Card className={CARD}>
      <CardHeader className={CARD_HEAD}>
        <CardTitle className="text-sm font-bold">Pengiriman Otomatis</CardTitle>
        <CardDescription className="text-xs">
          Mengatur email apa saja yang dikirim ke customer tanpa perlu Anda lakukan manual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-5">
        <ToggleRow
          id="email-enabled"
          title="Kirim email notifikasi"
          description="Saklar utama. Jika mati, tidak ada email yang dikirim; email yang terlewat dicatat di Riwayat."
          checked={draft.enabled}
          onChange={(enabled) => set({ enabled })}
        />
        <div className="border-t border-zinc-100 dark:border-zinc-800/80" />
        <ToggleRow
          id="email-invoice"
          title="Kirim invoice ke customer"
          description="Saat pembayaran diverifikasi, customer menerima email berisi invoice PDF."
          checked={draft.autoSendInvoice}
          onChange={(autoSendInvoice) => set({ autoSendInvoice })}
        />

        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800/80">
          {update.isError && (
            <span className="text-xs text-rose-600">{errorMessage(update.error)}</span>
          )}
          <Button
            disabled={!dirty || update.isPending}
            onClick={() => update.mutate(draft)}
            className="gap-1.5 bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600"
          >
            <Save className="size-3.5" />
            {update.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TestEmailCard({ smtpReady }: { smtpReady: boolean }) {
  const [to, setTo] = useState('');
  const send = useSendTestEmail();
  const valid = EMAIL_PATTERN.test(to.trim());

  return (
    <Card className={CARD}>
      <CardHeader className={CARD_HEAD}>
        <CardTitle className="text-sm font-bold">Kirim Email Tes</CardTitle>
        <CardDescription className="text-xs">
          Dikirim langsung lewat server SMTP, sehingga kesalahan seperti password salah atau server
          tidak terjangkau langsung terlihat.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <FormField label="Kirim ke">
            <Input
              type="email"
              inputMode="email"
              placeholder="email-anda@contoh.com"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </FormField>
        </div>
        <Button
          variant="outline"
          disabled={!smtpReady || !valid || send.isPending}
          onClick={() => send.mutate(to.trim())}
          className="gap-1.5"
        >
          <Send className="size-3.5" />
          {send.isPending ? 'Mengirim…' : 'Kirim email tes'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function EmailSettingsTab() {
  const settings = useEmailSettings();
  const studio = useStudioSettings();

  if (settings.isLoading) return <QueryLoading rows={4} />;
  if (settings.isError || !settings.data) {
    return (
      <QueryError
        title="Pengaturan email tidak dapat dimuat"
        message={errorMessage(settings.error)}
        retry={() => settings.refetch()}
      />
    );
  }

  const data = settings.data;
  const missingWhatsapp = studio.data && !studio.data.whatsappNumber;

  return (
    <div className="space-y-6">
      {missingWhatsapp && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3.5 text-xs text-zinc-700 dark:text-zinc-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <p>
            Nomor WhatsApp studio belum diisi, sehingga tautan WhatsApp di footer email dan tombol
            yang memakai <code className="font-mono">{'{studio_whatsapp_url}'}</code> tidak akan
            muncul.{' '}
            <Link
              href="/admin/settings/profil-studio"
              className="font-semibold text-amber-700 underline dark:text-amber-300"
            >
              Isi di Profil Studio
            </Link>
          </p>
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <SmtpStatusCard smtp={data.smtp} />
          <TestEmailCard smtpReady={data.smtp.configured} />
        </div>
        {/* Remounts after each save so the switches always show what the server stored. */}
        <SwitchesCard key={data.updatedAt} settings={data} />
      </div>
    </div>
  );
}
