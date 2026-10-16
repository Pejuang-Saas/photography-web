'use client';

import { useState } from 'react';
import { Banknote, CreditCard, Save } from 'lucide-react';
import type { AdminPaymentSettings, UpdatePaymentSettingsInput } from '@/lib/admin-api';
import type { PaymentMode } from '@/lib/api-types';
import { errorMessage, useUpdatePaymentSettings } from '@/lib/admin-queries';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import GatewayConfigForm, { type GatewayDraft } from './gateway-config-form';
import ManualAccountsManager from './manual-accounts-manager';

function ModeBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className="border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
      Aktif
    </Badge>
  ) : (
    <Badge className="border border-zinc-500/30 bg-zinc-500/10 text-[10px] font-bold text-zinc-500">
      Non-Aktif
    </Badge>
  );
}

function initialGateway(settings: AdminPaymentSettings): GatewayDraft {
  return {
    gatewayProvider: settings.gatewayProvider ?? 'MIDTRANS',
    gatewayEnvironment: settings.gatewayEnvironment ?? 'SANDBOX',
    merchantId: settings.merchantId ?? '',
    clientKey: settings.clientKey ?? '',
    serverKey: '',
    publicKey: settings.publicKey ?? '',
    secretKey: '',
    webhookToken: '',
  };
}

export default function PaymentSettingsCard({ settings }: { settings: AdminPaymentSettings }) {
  const update = useUpdatePaymentSettings();
  const [mode, setMode] = useState<PaymentMode>(settings.activeMode);
  const [allowDownPayment, setAllowDownPayment] = useState(settings.allowDownPayment);
  const [gateway, setGateway] = useState<GatewayDraft>(() => initialGateway(settings));

  const saved = initialGateway(settings);
  const dirty =
    mode !== settings.activeMode ||
    allowDownPayment !== settings.allowDownPayment ||
    (Object.keys(saved) as Array<keyof GatewayDraft>).some((key) => gateway[key] !== saved[key]);

  function handleReset() {
    setMode(settings.activeMode);
    setAllowDownPayment(settings.allowDownPayment);
    setGateway(initialGateway(settings));
    update.reset();
  }

  const configured = {
    serverKey: settings.serverKeyConfigured,
    secretKey: settings.secretKeyConfigured,
    webhookToken: settings.webhookTokenConfigured,
  };

  // Only a real gateway needs credentials before it can be switched on.
  const missing: string[] = [];
  if (mode === 'GATEWAY') {
    if (gateway.gatewayProvider === 'MIDTRANS') {
      if (!gateway.clientKey.trim()) missing.push('Client Key');
      if (!gateway.serverKey && !configured.serverKey) missing.push('Server Key');
    }
    if (gateway.gatewayProvider === 'XENDIT') {
      if (!gateway.secretKey && !configured.secretKey) missing.push('Secret Key');
      if (!gateway.webhookToken && !configured.webhookToken) missing.push('Callback Token');
    }
  }

  function handleSave() {
    const body: UpdatePaymentSettingsInput = {
      activeMode: mode,
      allowDownPayment,
      gatewayProvider: gateway.gatewayProvider,
      gatewayEnvironment: gateway.gatewayEnvironment,
      merchantId: gateway.merchantId.trim() || undefined,
      clientKey: gateway.clientKey.trim() || undefined,
      publicKey: gateway.publicKey.trim() || undefined,
      // Secrets are write-only: blank means "keep what is stored".
      serverKey: gateway.serverKey || undefined,
      secretKey: gateway.secretKey || undefined,
      webhookToken: gateway.webhookToken || undefined,
    };
    update.mutate(body);
  }

  return (
    <div className="space-y-5">
      <div
        className="grid gap-3 md:grid-cols-2"
        role="radiogroup"
        aria-label="Mode pembayaran aktif"
      >
        {(
          [
            [
              'GATEWAY',
              'Payment Gateway (Otomatis)',
              'Midtrans / Xendit — terkonfirmasi otomatis lewat webhook.',
              CreditCard,
            ],
            [
              'MANUAL',
              'Transfer Manual (Verifikasi Admin)',
              'Customer transfer lalu unggah bukti; admin memverifikasi.',
              Banknote,
            ],
          ] as const
        ).map(([value, title, description, Icon]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => setMode(value)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              mode === value
                ? 'border-amber-500 bg-amber-500/[0.06]'
                : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <Icon className="size-5 text-amber-500" />
              <ModeBadge active={mode === value} />
            </div>
            <h3 className="mt-2 text-sm font-bold text-zinc-900 dark:text-white">{title}</h3>
            <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
          </button>
        ))}
      </div>

      <Card className="rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <h3 id="dp-title" className="text-sm font-bold text-zinc-900 dark:text-white">
                Skema Pembayaran: DP 50%
              </h3>
              <p className="text-xs text-zinc-500">
                Jika dimatikan, customer hanya bisa membayar lunas di awal.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span
                className={`text-xs font-semibold ${
                  allowDownPayment ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'
                }`}
              >
                {allowDownPayment ? 'Diizinkan' : 'Dimatikan'}
              </span>
              <Switch
                checked={allowDownPayment}
                onCheckedChange={setAllowDownPayment}
                aria-labelledby="dp-title"
              />
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-zinc-200 p-3 dark:border-zinc-800">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Pilihan yang dilihat customer
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span
                className={`rounded-lg border px-3 py-1.5 font-medium ${
                  allowDownPayment
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-zinc-200 text-zinc-400 line-through dark:border-zinc-800'
                }`}
              >
                DP 50%
              </span>
              <span className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 font-medium text-amber-700 dark:text-amber-300">
                Bayar Lunas
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className={`rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60 ${
          mode === 'GATEWAY' ? '' : 'opacity-50'
        }`}
      >
        <CardHeader className="border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">Konfigurasi Payment Gateway</CardTitle>
              <CardDescription className="text-xs">
                {mode === 'GATEWAY'
                  ? 'Kunci API disimpan terenkripsi dan tidak pernah ditampilkan kembali.'
                  : 'Terkunci karena mode Transfer Manual sedang dipilih.'}
              </CardDescription>
            </div>
            <ModeBadge active={mode === 'GATEWAY'} />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <fieldset disabled={mode !== 'GATEWAY'} className="disabled:pointer-events-none">
            <GatewayConfigForm
              draft={gateway}
              configured={configured}
              onChange={(patch) => setGateway((current) => ({ ...current, ...patch }))}
            />
          </fieldset>
        </CardContent>
      </Card>

      <Card
        className={`rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60 ${
          mode === 'MANUAL' ? '' : 'opacity-50'
        }`}
      >
        <CardHeader className="border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">Transfer Manual</CardTitle>
              <CardDescription className="text-xs">
                {mode === 'MANUAL'
                  ? 'Perubahan rekening tersimpan langsung.'
                  : 'Terkunci karena mode Payment Gateway sedang dipilih.'}
              </CardDescription>
            </div>
            <ModeBadge active={mode === 'MANUAL'} />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <fieldset disabled={mode !== 'MANUAL'} className="disabled:pointer-events-none">
            <ManualAccountsManager />
          </fieldset>
        </CardContent>
      </Card>
      {(dirty || update.isError) && (
        <div className="sticky bottom-4 z-10 space-y-2 rounded-xl border border-amber-500/40 bg-white/95 p-3 shadow-lg backdrop-blur dark:bg-zinc-950/95">
          {missing.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Lengkapi dulu sebelum mengaktifkan gateway: {missing.join(', ')}.
            </p>
          )}
          {update.isError && (
            <p className="text-xs text-rose-700 dark:text-rose-300">{errorMessage(update.error)}</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Ada perubahan yang belum disimpan
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={update.isPending}
                className="h-9 text-xs"
              >
                Batalkan
              </Button>
              <Button
                onClick={handleSave}
                disabled={update.isPending || missing.length > 0}
                className="h-9 gap-1.5 bg-amber-500 text-xs font-bold text-zinc-950 hover:bg-amber-600"
              >
                <Save className="size-3.5" />
                {update.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
