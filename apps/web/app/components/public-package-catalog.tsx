'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { bookingApi, type AddOn, type ServicePackage } from '@/lib/booking-api';
import { formatRupiah } from '@/lib/format';
import {
  addOnPrice,
  addOnsFor,
  groupPackages,
  packageLines,
  packageTerms,
} from '@/lib/package-details';
import type { StudioInfo } from '@/lib/studio-api';
import { useStudioInfo } from '@/lib/studio-queries';
import PackageCard, { type PackageData } from './package-card';
import ScrollReveal from './scroll-reveal';

// Cover photos, handed out in turn: the packages are not tied to particular pictures.
const COVERS = ['01', '02', '08', '03', '05', '06', '09'];

function toPackageCardData(pkg: ServicePackage, index: number): PackageData {
  return {
    id: pkg.id,
    name: pkg.name,
    cover: COVERS[index % COVERS.length],
    summary:
      pkg.description ??
      `${pkg.durationMinutes} menit sesi foto untuk maksimal ${pkg.maxPeople} orang.`,
    price: pkg.price,
    lines: packageLines(pkg),
    terms: packageTerms(pkg),
    isFeatured: false,
  };
}

function AddOnPanel({ title, addOns }: { title: string; addOns: AddOn[] }) {
  return (
    <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-white/10 bg-card p-6 sm:p-7">
      <h4 className="font-mono text-[11px] uppercase tracking-wider text-muted-dim">{title}</h4>
      <ul className="mt-4 divide-y divide-white/5">
        {addOns.map((addOn) => (
          <li
            key={addOn.id}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 text-sm"
          >
            <span className="font-semibold text-fg">
              {addOn.name}
              {addOn.extraMinutes > 0 && (
                <span className="ml-2 text-xs font-normal text-muted">
                  (tambahan durasi {addOn.extraMinutes} menit)
                </span>
              )}
            </span>
            <span className="font-bold tabular-nums text-accent">
              {addOnPrice(addOn, formatRupiah)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PublicPackageCatalog({
  initialPackages,
  initialStudio,
}: {
  initialPackages?: ServicePackage[] | null;
  initialStudio?: StudioInfo | null;
}) {
  const router = useRouter();
  const packages = useQuery({
    queryKey: ['public', 'packages'],
    queryFn: bookingApi.listPackages,
    // Server-rendered list: the catalog is in the first HTML (SEO) and shows no loading flash.
    initialData: initialPackages ?? undefined,
    staleTime: 60_000,
  });
  const addOns = useQuery({
    queryKey: ['public', 'add-ons'],
    queryFn: bookingApi.listAddOns,
    staleTime: 60_000,
  });
  const studio = useStudioInfo(true, initialStudio ?? undefined);
  // Reservations switched off: the catalog is for looking only, with no way to start a booking.
  const closed = studio.data?.reservationsOpen === false;

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

  if (activePackages.length === 0) {
    return (
      <div className="mt-14 rounded-3xl border border-white/10 bg-card px-6 py-10 text-center text-sm text-muted">
        Belum ada paket yang tersedia saat ini.
      </div>
    );
  }

  const groups = groupPackages(activePackages);
  const generalTerms = studio.data?.reservationTerms ?? [];

  // Groups sold with the same add-ons share one panel, placed after the last of them, as the price
  // list does ("Add-on Lite & Premium").
  const offered = groups.map((group) => addOnsFor(addOns.data ?? [], group.category));
  const panelKey = (list: AddOn[]) => list.map((addOn) => addOn.id).join(',');
  let cover = 0;

  return (
    <div className="mt-14 space-y-16">
      {closed && (
        <p
          role="status"
          className="mx-auto max-w-2xl rounded-2xl border border-accent/30 bg-accent/[0.07] px-5 py-4 text-center text-sm text-fg"
        >
          Reservasi online sedang ditutup. Katalog ini untuk informasi saja
          {studio.data?.whatsappNumber
            ? '; hubungi kami lewat WhatsApp untuk menanyakan jadwal'
            : ''}
          .
        </p>
      )}

      {groups.map((group, groupIndex) => {
        const mine = offered[groupIndex];
        const key = panelKey(mine);
        const sharing = groups.filter((_, index) => panelKey(offered[index]) === key);
        const showsPanel = mine.length > 0 && sharing[sharing.length - 1].key === group.key;
        const count = group.packages.length;

        return (
          <section key={group.key} aria-labelledby={`group-${group.key}`}>
            <ScrollReveal>
              <div className="mx-auto max-w-2xl text-center">
                <h3
                  id={`group-${group.key}`}
                  className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl"
                >
                  {group.title}
                </h3>
                {group.intro && <p className="mt-2 text-sm text-muted">{group.intro}</p>}
              </div>
            </ScrollReveal>

            <div
              className={`mx-auto mt-8 grid items-stretch gap-8 ${
                count === 1
                  ? 'max-w-md'
                  : count === 2
                    ? 'max-w-4xl md:grid-cols-2'
                    : 'lg:grid-cols-3'
              }`}
            >
              {group.packages.map((pkg, index) => (
                <ScrollReveal key={pkg.id} delay={index * 0.1}>
                  <PackageCard
                    pkg={toPackageCardData(pkg, cover++)}
                    onSelect={closed ? undefined : () => router.push(`/reservasi/${pkg.slug}`)}
                  />
                </ScrollReveal>
              ))}
            </div>

            {showsPanel && (
              <AddOnPanel
                title={`Add-on ${sharing.map((item) => item.category).join(' & ')}`}
                addOns={mine}
              />
            )}
          </section>
        );
      })}

      {generalTerms.length > 0 && (
        <aside className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-card p-6 sm:p-7">
          <h4 className="font-mono text-[11px] uppercase tracking-wider text-muted-dim">
            Ketentuan umum
          </h4>
          <ul className="mt-4 space-y-2.5 text-xs leading-relaxed text-muted">
            {generalTerms.map((term) => (
              <li key={term} className="flex gap-2.5">
                <span className="text-accent">•</span>
                {term}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
