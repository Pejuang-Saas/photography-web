'use client';

import { useState } from 'react';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { apiUrl } from '@/lib/api-client';
import type { GatewayEnvironment, GatewayProvider } from '@/lib/api-types';
import { Input } from '@/components/ui/input';

export type GatewayDraft = {
  gatewayProvider: GatewayProvider;
  gatewayEnvironment: GatewayEnvironment;
  merchantId: string;
  clientKey: string;
  serverKey: string;
  publicKey: string;
  secretKey: string;
  webhookToken: string;
};

export type ConfiguredSecrets = {
  serverKey: boolean;
  secretKey: boolean;
  webhookToken: boolean;
};

// The mock provider confirms payments without a real gateway, so the API refuses it in production.
const providers: Array<{ value: GatewayProvider; label: string }> = [
  { value: 'MIDTRANS', label: 'Midtrans' },
  { value: 'XENDIT', label: 'Xendit' },
  ...(process.env.NODE_ENV !== 'production'
    ? [{ value: 'MOCK' as const, label: 'Mock (khusus pengembangan)' }]
    : []),
];

function SecretField({
  id,
  label,
  value,
  configured,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  configured: boolean;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete="off"
          maxLength={500}
          value={value}
          placeholder={configured ? 'Tersimpan — kosongkan jika tidak diubah' : ''}
          onChange={(event) => onChange(event.target.value)}
          className="pr-9 font-mono"
        />
        <button
          type="button"
          aria-label={visible ? 'Sembunyikan' : 'Tampilkan'}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

function CopyableUrl({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-1">
      <span className="font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-900">
        <code className="min-w-0 flex-1 truncate text-[11px]">{url}</code>
        <button
          type="button"
          aria-label="Salin URL"
          onClick={() => {
            void navigator.clipboard.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

export default function GatewayConfigForm({
  draft,
  configured,
  onChange,
}: {
  draft: GatewayDraft;
  configured: ConfiguredSecrets;
  onChange: (patch: Partial<GatewayDraft>) => void;
}) {
  const isMidtrans = draft.gatewayProvider === 'MIDTRANS';
  const isXendit = draft.gatewayProvider === 'XENDIT';

  return (
    <div className="space-y-4 text-xs">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="font-medium text-zinc-600 dark:text-zinc-400">Provider</span>
          <select
            value={draft.gatewayProvider}
            onChange={(event) =>
              onChange({ gatewayProvider: event.target.value as GatewayProvider })
            }
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          >
            {providers.map((provider) => (
              <option
                key={provider.value}
                value={provider.value}
                className="bg-white dark:bg-zinc-900"
              >
                {provider.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-1">
          <legend className="font-medium text-zinc-600 dark:text-zinc-400">Environment</legend>
          <div className="flex gap-2">
            {(
              [
                ['SANDBOX', 'Sandbox / Test'],
                ['PRODUCTION', 'Production / Live'],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-1.5 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-500/10 dark:border-zinc-800"
              >
                <input
                  type="radio"
                  className="size-4 accent-amber-500"
                  name="gateway-environment"
                  checked={draft.gatewayEnvironment === value}
                  onChange={() => onChange({ gatewayEnvironment: value })}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {isMidtrans && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Merchant ID</span>
            <Input
              maxLength={160}
              value={draft.merchantId}
              onChange={(event) => onChange({ merchantId: event.target.value })}
              className="font-mono"
            />
          </label>
          <label className="space-y-1">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Client Key</span>
            <Input
              maxLength={160}
              value={draft.clientKey}
              onChange={(event) => onChange({ clientKey: event.target.value })}
              className="font-mono"
            />
          </label>
          <SecretField
            id="midtrans-server-key"
            label="Server Key"
            value={draft.serverKey}
            configured={configured.serverKey}
            onChange={(serverKey) => onChange({ serverKey })}
          />
          <div className="sm:col-span-2">
            <CopyableUrl
              label="Payment Notification URL (isi di dashboard Midtrans)"
              url={`${apiUrl}/webhooks/payments/midtrans`}
            />
          </div>
        </div>
      )}

      {isXendit && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Public Key</span>
            <Input
              maxLength={160}
              value={draft.publicKey}
              onChange={(event) => onChange({ publicKey: event.target.value })}
              className="font-mono"
            />
          </label>
          <SecretField
            id="xendit-secret-key"
            label="Secret Key"
            value={draft.secretKey}
            configured={configured.secretKey}
            onChange={(secretKey) => onChange({ secretKey })}
          />
          <div className="sm:col-span-2">
            <SecretField
              id="xendit-webhook-token"
              label="Callback Verification Token (wajib agar webhook diterima)"
              value={draft.webhookToken}
              configured={configured.webhookToken}
              onChange={(webhookToken) => onChange({ webhookToken })}
            />
          </div>
          <div className="sm:col-span-2">
            <CopyableUrl
              label="Invoice Callback URL (isi di dashboard Xendit)"
              url={`${apiUrl}/webhooks/payments/xendit`}
            />
          </div>
        </div>
      )}

      {draft.gatewayProvider === 'MOCK' && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
          Provider Mock menandai pembayaran berhasil tanpa gateway sungguhan. Hanya untuk
          pengembangan; API menolaknya di production.
        </p>
      )}
    </div>
  );
}
