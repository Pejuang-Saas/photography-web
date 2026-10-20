import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { revalidateWeb } from '../common/revalidate-web';
import { registerCategories } from './category-registry';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackageCategoryDto, UpdatePackageCategoryDto } from './dto/package-category.dto';
import { CreateServicePackageDto, UpdateServicePackageDto } from './dto/package.dto';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  list(includeInactive = false) {
    return this.prisma.servicePackage.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { price: 'asc' }],
    });
  }

  /** For the catalog: every category with its heading and introduction. */
  listCategories() {
    return this.prisma.packageCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * For the admin: every category with how many packages and add-ons use it. A category that a
   * package or add-on already names but nobody registered is registered here, so nothing in use is
   * ever missing from the list.
   */
  async listCategoriesAdmin() {
    const [packages, addOns, known] = await Promise.all([
      // Only packages on sale count: a hidden old package must not keep a category alive.
      this.prisma.servicePackage.findMany({
        where: { isActive: true },
        select: { category: true },
      }),
      this.prisma.addOn.findMany({ where: { isActive: true }, select: { categories: true } }),
      this.prisma.packageCategory.findMany(),
    ]);

    const used = new Map<string, string>();
    for (const name of [
      ...packages.flatMap((pkg) => (pkg.category?.trim() ? [pkg.category.trim()] : [])),
      ...addOns.flatMap((addOn) => addOn.categories),
    ]) {
      if (!used.has(name.toLowerCase())) used.set(name.toLowerCase(), name);
    }
    const unregistered = [...used].filter(([key]) => !known.some((row) => row.key === key));
    if (unregistered.length > 0) {
      await this.prisma.packageCategory.createMany({
        data: unregistered.map(([key, name]) => ({ key, name, title: name })),
        skipDuplicates: true,
      });
    }

    const rows = await this.listCategories();
    return rows.map((row) => ({
      ...row,
      packageCount: packages.filter((pkg) => pkg.category?.trim().toLowerCase() === row.key).length,
      addOnCount: addOns.filter((addOn) =>
        addOn.categories.some((name) => name.trim().toLowerCase() === row.key),
      ).length,
    }));
  }

  async createCategory(dto: CreatePackageCategoryDto) {
    try {
      const created = await this.prisma.packageCategory.create({
        data: {
          key: dto.name.toLowerCase(),
          name: dto.name,
          title: dto.title,
          description: dto.description?.trim() || null,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      void revalidateWeb();
      return created;
    } catch (error) {
      throw this.categoryConflict(error);
    }
  }

  /**
   * Packages and add-ons name their category as text, so a rename has to be carried to each of
   * them, or they would be left under a category that no longer exists.
   */
  async updateCategory(id: string, dto: UpdatePackageCategoryDto) {
    const current = await this.requireCategory(id);
    const renamed = dto.name !== undefined && dto.name !== current.name;
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (renamed) {
          const name = dto.name!;
          await tx.servicePackage.updateMany({
            where: { category: { equals: current.name, mode: 'insensitive' } },
            data: { category: name },
          });
          const withIt = await tx.addOn.findMany({ select: { id: true, categories: true } });
          for (const addOn of withIt) {
            if (!addOn.categories.some((item) => item.toLowerCase() === current.key)) continue;
            await tx.addOn.update({
              where: { id: addOn.id },
              data: {
                categories: [
                  ...new Set(
                    addOn.categories.map((item) =>
                      item.toLowerCase() === current.key ? name : item,
                    ),
                  ),
                ],
              },
            });
          }
        }
        return tx.packageCategory.update({
          where: { id },
          data: {
            ...(dto.name !== undefined && { name: dto.name, key: dto.name.toLowerCase() }),
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.description !== undefined && { description: dto.description.trim() || null }),
            ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
          },
        });
      });
      void revalidateWeb();
      return updated;
    } catch (error) {
      throw this.categoryConflict(error);
    }
  }

  /** A category that packages still use stays; the add-ons just stop naming it. */
  async removeCategory(id: string) {
    const category = await this.requireCategory(id);
    const inUse = await this.prisma.servicePackage.count({
      where: { isActive: true, category: { equals: category.name, mode: 'insensitive' } },
    });
    if (inUse > 0) {
      throw new ConflictException(
        `Kategori masih dipakai ${inUse} paket. Pindahkan paketnya ke kategori lain dulu.`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      const withIt = await tx.addOn.findMany({ select: { id: true, categories: true } });
      for (const addOn of withIt) {
        if (!addOn.categories.some((item) => item.toLowerCase() === category.key)) continue;
        await tx.addOn.update({
          where: { id: addOn.id },
          data: {
            categories: addOn.categories.filter((item) => item.toLowerCase() !== category.key),
          },
        });
      }
      await tx.packageCategory.delete({ where: { id } });
    });
    void revalidateWeb();
  }

  private async requireCategory(id: string) {
    const found = await this.prisma.packageCategory.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Category not found');
    return found;
  }

  private categoryConflict(error: unknown) {
    return this.isUniqueViolation(error)
      ? new ConflictException('Nama kategori sudah dipakai')
      : error;
  }

  async create(dto: CreateServicePackageDto) {
    await registerCategories(this.prisma, [dto.category]);
    const created = await this.prisma.servicePackage.create({
      data: {
        ...dto,
        durationMinutes: dto.durationMinutes ?? 60,
        maxPeople: dto.maxPeople ?? 1,
      },
    });
    void revalidateWeb();
    return created;
  }

  async update(id: string, dto: UpdateServicePackageDto) {
    await this.requireActiveOrExisting(id, false);
    await registerCategories(this.prisma, [dto.category]);
    const updated = await this.prisma.servicePackage.update({ where: { id }, data: dto });
    void revalidateWeb();
    return updated;
  }

  async requireActive(id: string) {
    return this.requireActiveOrExisting(id, true);
  }

  async requireExisting(id: string) {
    return this.requireActiveOrExisting(id, false);
  }

  private async requireActiveOrExisting(id: string, activeOnly: boolean) {
    const packageItem = await this.prisma.servicePackage.findFirst({
      where: { id, ...(activeOnly ? { isActive: true } : {}) },
    });
    if (!packageItem) throw new NotFoundException('Package not found');
    return packageItem;
  }

  isUniqueViolation(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
