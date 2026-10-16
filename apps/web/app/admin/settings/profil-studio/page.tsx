'use client';

import { errorMessage, useStudioSettings } from '@/lib/admin-queries';
import { QueryError, QueryLoading } from '../../components/query-state';
import StudioProfileForm from '../components/studio-profile-form';

export default function StudioProfilePage() {
  const settings = useStudioSettings();

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80">
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
          Profil Studio
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
          Nomor WhatsApp CS, alamat, Instagram, dan jaminan yang dilihat customer saat memesan.
        </p>
      </div>

      {settings.isLoading && <QueryLoading rows={4} />}
      {settings.isError && (
        <QueryError
          title="Profil studio tidak dapat dimuat"
          message={errorMessage(settings.error)}
          retry={() => settings.refetch()}
        />
      )}
      {settings.data && (
        // Remounts after each save so the form always reflects what the server stored.
        <StudioProfileForm key={settings.data.updatedAt} settings={settings.data} />
      )}
    </div>
  );
}
