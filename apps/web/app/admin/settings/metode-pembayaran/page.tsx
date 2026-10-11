'use client';

import { errorMessage, usePaymentSettings } from '@/lib/admin-queries';
import { QueryError, QueryLoading } from '../../components/query-state';
import PaymentSettingsCard from '../components/payment-settings-card';

export default function PaymentMethodsPage() {
  const settings = usePaymentSettings();

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80">
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
          Metode Pembayaran
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
          Pilih satu mode pembayaran aktif untuk reservasi di website. Mode lainnya otomatis
          terkunci.
        </p>
      </div>

      {settings.isLoading && <QueryLoading rows={4} />}
      {settings.isError && (
        <QueryError
          title="Pengaturan tidak dapat dimuat"
          message={errorMessage(settings.error)}
          retry={() => settings.refetch()}
        />
      )}
      {settings.data && (
        // Remounts after each save so entered secrets are cleared and the form reflects the server.
        <PaymentSettingsCard key={settings.data.updatedAt} settings={settings.data} />
      )}
    </div>
  );
}
