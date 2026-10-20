import type { PrismaService } from '../prisma/prisma.service';

/**
 * Makes sure every category a package or add-on names has a row of its own, so the list the admin
 * edits is never missing one that is in use. A new row starts with its name as its heading.
 */
export async function registerCategories(
  prisma: Pick<PrismaService, 'packageCategory'>,
  names: Array<string | null | undefined>,
) {
  const unique = new Map<string, string>();
  for (const raw of names) {
    const name = raw?.trim();
    if (name && !unique.has(name.toLowerCase())) unique.set(name.toLowerCase(), name);
  }
  if (unique.size === 0) return;
  await prisma.packageCategory.createMany({
    data: [...unique].map(([key, name]) => ({ key, name, title: name })),
    skipDuplicates: true,
  });
}
