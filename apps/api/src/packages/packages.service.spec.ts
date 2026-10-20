import { ConflictException, NotFoundException } from '@nestjs/common';
import { PackagesService } from './packages.service';

type Row = Record<string, any>;

function setup(options: { categories?: Row[]; packages?: Row[]; addOns?: Row[] } = {}) {
  const categories = options.categories ?? [];
  const packages = options.packages ?? [];
  const addOns = options.addOns ?? [];
  const prisma: Row = {
    servicePackage: {
      findMany: jest.fn().mockResolvedValue(packages),
      count: jest.fn(
        async ({ where }: any) =>
          packages.filter(
            (p) =>
              p.category?.toLowerCase() === where.category.equals.toLowerCase() &&
              (where.isActive === undefined || p.isActive !== false),
          ).length,
      ),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    addOn: {
      findMany: jest.fn().mockResolvedValue(addOns),
      update: jest.fn().mockResolvedValue({}),
    },
    packageCategory: {
      findMany: jest.fn(async () => categories),
      findUnique: jest.fn(
        async ({ where }: any) => categories.find((c) => c.id === where.id) ?? null,
      ),
      create: jest.fn(async ({ data }: any) => ({ id: 'new', ...data })),
      update: jest.fn(async ({ data }: any) => ({ id: 'c1', ...data })),
      delete: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  prisma.$transaction = jest.fn(async (work: (tx: Row) => unknown) => work(prisma));
  return { prisma, service: new PackagesService(prisma as never) };
}

const lite = { id: 'c1', key: 'lite', name: 'Lite', title: 'Lite Version', sortOrder: 10 };

describe('package categories', () => {
  it('counts the packages and add-ons of each category, ignoring capitals', async () => {
    const { service } = setup({
      categories: [lite],
      packages: [{ category: 'lite' }, { category: 'Lite' }, { category: 'Premium' }],
      addOns: [{ categories: ['LITE', 'Premium'] }, { categories: ['Group'] }],
    });

    const [row] = await service.listCategoriesAdmin();

    expect(row).toMatchObject({ name: 'Lite', packageCount: 2, addOnCount: 1 });
  });

  it('registers a category that packages or add-ons use but nobody listed', async () => {
    const { service, prisma } = setup({
      categories: [lite],
      packages: [{ category: 'Lite' }, { category: 'Group' }, { category: null }],
      addOns: [{ categories: ['Premium', 'group'] }],
    });

    await service.listCategoriesAdmin();

    expect(prisma.packageCategory.createMany).toHaveBeenCalledWith({
      data: [
        { key: 'group', name: 'Group', title: 'Group' },
        { key: 'premium', name: 'Premium', title: 'Premium' },
      ],
      skipDuplicates: true,
    });
  });

  it('does not touch the table when every used category is already listed', async () => {
    const { service, prisma } = setup({ categories: [lite], packages: [{ category: 'LITE' }] });

    await service.listCategoriesAdmin();

    expect(prisma.packageCategory.createMany).not.toHaveBeenCalled();
  });

  it('creates a category under a lower-case key', async () => {
    const { service, prisma } = setup();

    await service.createCategory({ name: 'Lite', title: 'Lite Version', description: '  Intro ' });

    expect(prisma.packageCategory.create.mock.calls[0][0].data).toEqual({
      key: 'lite',
      name: 'Lite',
      title: 'Lite Version',
      description: 'Intro',
      sortOrder: 0,
    });
  });

  it('says the name is taken when it is', async () => {
    const { service, prisma } = setup();
    const { Prisma } = jest.requireActual('@prisma/client');
    prisma.packageCategory.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );

    await expect(service.createCategory({ name: 'Lite', title: 'x' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('carries a rename to the packages and add-ons that use it', async () => {
    const { service, prisma } = setup({
      categories: [lite],
      addOns: [
        { id: 'a1', categories: ['Lite', 'Premium'] },
        { id: 'a2', categories: ['Group'] },
      ],
    });

    await service.updateCategory('c1', { name: 'Reguler' });

    expect(prisma.servicePackage.updateMany).toHaveBeenCalledWith({
      where: { category: { equals: 'Lite', mode: 'insensitive' } },
      data: { category: 'Reguler' },
    });
    expect(prisma.addOn.update).toHaveBeenCalledTimes(1);
    expect(prisma.addOn.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { categories: ['Reguler', 'Premium'] },
    });
    expect(prisma.packageCategory.update.mock.calls[0][0].data).toMatchObject({
      name: 'Reguler',
      key: 'reguler',
    });
  });

  it('leaves packages alone when only the heading changes', async () => {
    const { service, prisma } = setup({ categories: [lite] });

    await service.updateCategory('c1', { title: 'Lite Edition', description: '' });

    expect(prisma.servicePackage.updateMany).not.toHaveBeenCalled();
    expect(prisma.packageCategory.update.mock.calls[0][0].data).toEqual({
      title: 'Lite Edition',
      description: null,
    });
  });

  it('refuses to delete a category packages still use, and says how many', async () => {
    const { service, prisma } = setup({
      categories: [lite],
      packages: [{ category: 'Lite' }, { category: 'lite' }],
    });

    await expect(service.removeCategory('c1')).rejects.toThrow('masih dipakai 2 paket');
    expect(prisma.packageCategory.delete).not.toHaveBeenCalled();
  });

  it('does not count a hidden package as using a category', async () => {
    const { service, prisma } = setup({
      categories: [lite],
      packages: [{ category: 'Lite', isActive: false }],
    });

    await service.removeCategory('c1');

    expect(prisma.servicePackage.count.mock.calls[0][0].where).toMatchObject({ isActive: true });
    expect(prisma.packageCategory.delete).toHaveBeenCalled();
  });

  it('deletes an unused category and takes its name off the add-ons', async () => {
    const { service, prisma } = setup({
      categories: [lite],
      addOns: [{ id: 'a1', categories: ['Lite', 'Premium'] }],
    });

    await service.removeCategory('c1');

    expect(prisma.addOn.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { categories: ['Premium'] },
    });
    expect(prisma.packageCategory.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('says so when the category does not exist', async () => {
    const { service } = setup();

    await expect(service.removeCategory('gone')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.updateCategory('gone', { title: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
