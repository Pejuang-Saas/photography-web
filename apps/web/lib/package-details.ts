import type { AddOn, PackageCategory, ServicePackage } from './booking-api';

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/**
 * What a package offers, one line each, in the order the price list gives them. The first free-text
 * feature is by convention who the session is for ("1 Wisudawan | Keluarga & Teman"); the numbers
 * come next, worded from the package's own fields so they always match what is stored; the rest of
 * the free-text features close the list.
 */
export function packageLines(
  pkg: ServicePackage,
  /** Figures the caller already shows on their own, so they are not listed twice. */
  omit: Array<'duration' | 'editedPhotos' | 'driveActiveDays'> = [],
): string[] {
  const features = stringList(pkg.features);
  const lines: string[] = [];
  if (!omit.includes('duration')) lines.push(`Durasi sesi ${pkg.durationMinutes} menit`);
  if (pkg.editedPhotos && !omit.includes('editedPhotos')) {
    lines.push(`${pkg.editedPhotos} foto edit`);
  }
  if (pkg.driveActiveDays && !omit.includes('driveActiveDays')) {
    lines.push(`Link Google Drive aktif selama ${pkg.driveActiveDays} hari`);
  }
  if (pkg.uploadAllHours) {
    lines.push(`Upload semua file maksimal ${pkg.uploadAllHours} jam setelah sesi selesai`);
  }
  if (pkg.uploadEditDays) {
    lines.push(`Upload foto edit maksimal ${pkg.uploadEditDays} hari kerja setelah sesi selesai`);
  }
  if (pkg.maxSpots) {
    lines.push(
      `Maksimal ${pkg.maxSpots} spot foto dalam area yang masih dapat dijangkau selama durasi sesi`,
    );
  }
  if (pkg.bonusPriorityEdits) {
    lines.push(
      `Bonus ${pkg.bonusPriorityEdits} foto edit prioritas yang dikirim pada hari wisuda (maksimal pukul 23.59 WIB)`,
    );
  }
  return [...features.slice(0, 1), ...lines, ...features.slice(1)];
}

/** This package's own conditions. */
export const packageTerms = (pkg: ServicePackage): string[] => stringList(pkg.terms);

export type PackageGroup = {
  key: string;
  category: string;
  title: string;
  intro: string | null;
  packages: ServicePackage[];
};

/**
 * Packages gathered by category. A category's heading, introduction and place come from the
 * categories the admin keeps; one with no entry there shows under its own name, after the rest.
 */
export function groupPackages(
  packages: ServicePackage[],
  categories: PackageCategory[] = [],
): PackageGroup[] {
  const known = new Map(categories.map((category) => [category.key, category]));
  const sorted = [...packages].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.price - b.price || a.name.localeCompare(b.name),
  );

  const groups = new Map<string, PackageGroup & { order: number }>();
  for (const pkg of sorted) {
    const name = pkg.category?.trim() || 'Paket';
    const key = name.toLowerCase();
    let group = groups.get(key);
    if (!group) {
      const entry = known.get(key);
      group = {
        key,
        category: entry?.name ?? name,
        title: entry?.title ?? name,
        intro: entry?.description ?? null,
        order: entry?.sortOrder ?? Number.MAX_SAFE_INTEGER,
        packages: [],
      };
      groups.set(key, group);
    }
    group.packages.push(pkg);
  }
  return [...groups.values()]
    .sort((a, b) => a.order - b.order || a.packages[0].sortOrder - b.packages[0].sortOrder)
    .map((group) => ({
      key: group.key,
      category: group.category,
      title: group.title,
      intro: group.intro,
      packages: group.packages,
    }));
}

/** The add-ons offered with a package of this category. */
export const addOnsFor = (addOns: AddOn[], category: string | null) =>
  addOns.filter(
    (addOn) =>
      addOn.isActive &&
      (addOn.categories.length === 0 ||
        (category !== null &&
          addOn.categories.some(
            (item) => item.trim().toLowerCase() === category.trim().toLowerCase(),
          ))),
  );

/** "Rp100.000 / 30 menit" */
export const addOnPrice = (
  addOn: Pick<AddOn, 'price' | 'unitLabel'>,
  format: (n: number) => string,
) => `${format(addOn.price)} / ${addOn.unitLabel}`;

export type OrderSummary = {
  lines: Array<{ addOn: AddOn; quantity: number; subtotal: number; extraMinutes: number }>;
  addOnsTotal: number;
  extraMinutes: number;
  total: number;
};

/** What the customer's picks add up to. Only for showing: the server prices the real booking. */
export function summarizeOrder(
  pkg: Pick<ServicePackage, 'price'>,
  addOns: AddOn[],
  picked: Record<string, number>,
): OrderSummary {
  const lines = addOns.flatMap((addOn) => {
    const quantity = picked[addOn.id] ?? 0;
    return quantity > 0
      ? [
          {
            addOn,
            quantity,
            subtotal: addOn.price * quantity,
            extraMinutes: addOn.extraMinutes * quantity,
          },
        ]
      : [];
  });
  const addOnsTotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  return {
    lines,
    addOnsTotal,
    extraMinutes: lines.reduce((sum, line) => sum + line.extraMinutes, 0),
    total: pkg.price + addOnsTotal,
  };
}
