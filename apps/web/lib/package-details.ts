import type { AddOn, ServicePackage } from './booking-api';

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/**
 * What a package offers, one line each, in the order the price list gives them. The first free-text
 * feature is by convention who the session is for ("1 Wisudawan | Keluarga & Teman"); the numbers
 * come next, worded from the package's own fields so they always match what is stored; the rest of
 * the free-text features close the list.
 */
export function packageLines(pkg: ServicePackage): string[] {
  const features = stringList(pkg.features);
  const lines: string[] = [];
  lines.push(`Durasi sesi ${pkg.durationMinutes} menit`);
  if (pkg.editedPhotos) lines.push(`${pkg.editedPhotos} foto edit`);
  if (pkg.driveActiveDays) {
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

/** The headings and introductions of the price list's groups; an unknown group has neither. */
const GROUP_COPY: Record<string, { title: string; intro: string }> = {
  lite: {
    title: 'Lite Version',
    intro:
      'Paket sederhana untuk mengabadikan momen wisuda dengan hasil yang tetap berkualitas dan berkesan. Cocok untuk sesi singkat bersama keluarga dan teman terdekat.',
  },
  premium: {
    title: 'Premium Version',
    intro:
      'Untuk kamu yang menginginkan pengalaman sesi foto wisuda yang lebih eksklusif dan hasil yang lebih maksimal. Lebih banyak waktu, lebih banyak foto edit, dan prioritas pengerjaan untuk momen yang benar-benar istimewa.',
  },
  group: {
    title: 'Group Session',
    intro:
      'Abadikan kebersamaan bersama sahabat wisudamu dalam satu sesi yang seru dan penuh cerita. Cocok untuk momen perpisahan, persahabatan, dan kenangan yang akan selalu dikenang.',
  },
};

export type PackageGroup = {
  key: string;
  category: string;
  title: string;
  intro: string | null;
  packages: ServicePackage[];
};

/** Packages gathered by category, groups and packages in the order the admin set. */
export function groupPackages(packages: ServicePackage[]): PackageGroup[] {
  const sorted = [...packages].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.price - b.price || a.name.localeCompare(b.name),
  );
  const groups = new Map<string, PackageGroup>();
  for (const pkg of sorted) {
    const category = pkg.category?.trim() || 'Paket';
    const key = category.toLowerCase();
    let group = groups.get(key);
    if (!group) {
      const copy = GROUP_COPY[key];
      group = {
        key,
        category,
        title: copy?.title ?? category,
        intro: copy?.intro ?? null,
        packages: [],
      };
      groups.set(key, group);
    }
    group.packages.push(pkg);
  }
  return [...groups.values()];
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
