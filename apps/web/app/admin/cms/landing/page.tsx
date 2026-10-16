'use client';

import { errorMessage, useLandingContent } from '@/lib/admin-queries';
import { QueryError, QueryLoading } from '../../components/query-state';
import LandingContentForm from './landing-content-form';

export default function LandingContentPage() {
  const content = useLandingContent();

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80">
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
          Konten Halaman
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
          Teks utama landing page dan data SEO. Perubahan langsung tampil setelah disimpan.
        </p>
      </div>

      {content.isLoading && <QueryLoading rows={4} />}
      {content.isError && (
        <QueryError
          title="Konten halaman tidak dapat dimuat"
          message={errorMessage(content.error)}
          retry={() => content.refetch()}
        />
      )}
      {content.data && <LandingContentForm saved={content.data} />}
    </div>
  );
}
