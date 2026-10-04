'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookingApi, type ServicePackage } from '@/lib/booking-api';
import PackageCard, { type PackageData } from './package-card';
import PublicBookingDialog from './public-booking-dialog';
import ScrollReveal from './scroll-reveal';

const presentationBySlug: Record<string, { cover: string; badge?: string; isFeatured: boolean }> = {
  'solo-graduation': { cover: '01', isFeatured: false },
  'squad-graduation': { cover: '02', badge: 'Paling Diminati', isFeatured: true },
  'family-package': { cover: '08', isFeatured: false },
};

const presentationByIndex = ['01', '02', '08'];

function getFeatures(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  return features.filter((feature): feature is string => typeof feature === 'string');
}

function toPackageCardData(pkg: ServicePackage, index: number): PackageData {
  const presentation = presentationBySlug[pkg.slug] ?? {
    cover: presentationByIndex[index] ?? '01',
    isFeatured: index === 1,
    ...(index === 1 ? { badge: 'Paling Diminati' } : {}),
  };

  return {
    id: pkg.id,
    name: pkg.name,
    cover: presentation.cover,
    summary:
      pkg.description ??
      `${pkg.durationMinutes} menit sesi foto untuk maksimal ${pkg.maxPeople} orang.`,
    price: pkg.price,
    badge: presentation.badge,
    features: getFeatures(pkg.features),
    isFeatured: presentation.isFeatured,
  };
}

export default function PublicPackageCatalog() {
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const packages = useQuery({
    queryKey: ['public', 'packages'],
    queryFn: bookingApi.listPackages,
    staleTime: 60_000,
  });

  if (packages.isLoading) {
    return (
      <div className="mt-14 grid gap-8 lg:grid-cols-3 items-stretch">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-[520px] animate-pulse rounded-3xl bg-card" />
        ))}
      </div>
    );
  }

  if (packages.isError) {
    return (
      <div className="mt-14 rounded-3xl border border-red-400/20 bg-red-400/5 px-6 py-10 text-center text-sm text-muted">
        Katalog paket sedang tidak dapat dimuat. Silakan coba lagi beberapa saat.
      </div>
    );
  }

  const activePackages = (packages.data ?? []).filter((pkg) => pkg.isActive);
  const selectedPackage = activePackages.find((pkg) => pkg.id === selectedPackageId);

  if (activePackages.length === 0) {
    return (
      <div className="mt-14 rounded-3xl border border-white/10 bg-card px-6 py-10 text-center text-sm text-muted">
        Belum ada paket yang tersedia saat ini.
      </div>
    );
  }

  return (
    <div className="mt-14 grid gap-8 lg:grid-cols-3 items-stretch">
      {activePackages.map((pkg, index) => (
        <ScrollReveal key={pkg.id} delay={index * 0.1}>
          <PackageCard
            pkg={toPackageCardData(pkg, index)}
            onSelect={() => setSelectedPackageId(pkg.id)}
          />
        </ScrollReveal>
      ))}
      {selectedPackage && (
        <PublicBookingDialog
          key={selectedPackage.id}
          packageItem={selectedPackage}
          open={Boolean(selectedPackageId)}
          onOpenChange={(open) => !open && setSelectedPackageId(null)}
        />
      )}
    </div>
  );
}
