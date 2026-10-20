import { appliesTo, AddOnsService } from './add-ons.service';

const addOn = (extra: Record<string, unknown> = {}) => ({
  id: 'a1',
  name: 'Tambahan waktu',
  unitLabel: '30 menit',
  price: 100_000,
  extraMinutes: 30,
  maxQuantity: 4,
  categories: ['Lite', 'Premium'],
  isActive: true,
  ...extra,
});

function build(found: Array<Record<string, unknown>>) {
  const prisma = {
    addOn: {
      findMany: jest.fn().mockResolvedValue(found),
      findUnique: jest.fn().mockResolvedValue({ id: 'a1' }),
      create: jest.fn(async ({ data }: any) => ({ id: 'a1', ...data })),
      update: jest.fn(async ({ data }: any) => ({ id: 'a1', ...data })),
      delete: jest.fn().mockResolvedValue({}),
    },
  };
  return { prisma, service: new AddOnsService(prisma as never) };
}

describe('appliesTo', () => {
  it('matches a category whatever its capitals, and every package when none are listed', () => {
    expect(appliesTo({ categories: ['Lite', 'Premium'] }, 'premium')).toBe(true);
    expect(appliesTo({ categories: ['Group'] }, 'Lite')).toBe(false);
    expect(appliesTo({ categories: ['Group'] }, null)).toBe(false);
    expect(appliesTo({ categories: [] }, 'Anything')).toBe(true);
    expect(appliesTo({ categories: [] }, null)).toBe(true);
  });
});

describe('AddOnsService.price', () => {
  it('prices each line from the stored add-on: unit price times quantity, and time times quantity', async () => {
    const { service } = build([addOn()]);

    expect(await service.price([{ addOnId: 'a1', quantity: 3 }], { category: 'Lite' })).toEqual([
      {
        addOnId: 'a1',
        name: 'Tambahan waktu',
        unitLabel: '30 menit',
        unitPrice: 100_000,
        quantity: 3,
        extraMinutes: 90,
        subtotal: 300_000,
      },
    ]);
  });

  it('has nothing to price when nothing is chosen', async () => {
    const { service, prisma } = build([]);

    expect(await service.price(undefined, { category: 'Lite' })).toEqual([]);
    expect(await service.price([], { category: 'Lite' })).toEqual([]);
    expect(prisma.addOn.findMany).not.toHaveBeenCalled();
  });

  it('only reads active add-ons', async () => {
    const { service, prisma } = build([addOn()]);

    await service.price([{ addOnId: 'a1', quantity: 1 }], { category: 'Lite' });

    expect(prisma.addOn.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ['a1'] },
      isActive: true,
    });
  });

  it('refuses an add-on that is gone, inactive, or not offered with this package', async () => {
    await expect(
      build([]).service.price([{ addOnId: 'a1', quantity: 1 }], { category: 'Lite' }),
    ).rejects.toThrow('tidak tersedia untuk paket');
    await expect(
      build([addOn({ categories: ['Group'] })]).service.price([{ addOnId: 'a1', quantity: 1 }], {
        category: 'Lite',
      }),
    ).rejects.toThrow('tidak tersedia untuk paket');
  });

  it.each([0, 5, 1.5, -1])('refuses a quantity of %s', async (quantity) => {
    await expect(
      build([addOn()]).service.price([{ addOnId: 'a1', quantity }], { category: 'Lite' }),
    ).rejects.toThrow('Jumlah Tambahan waktu');
  });

  it('refuses the same add-on twice, so a quantity limit cannot be got around', async () => {
    await expect(
      build([addOn()]).service.price(
        [
          { addOnId: 'a1', quantity: 3 },
          { addOnId: 'a1', quantity: 3 },
        ],
        { category: 'Lite' },
      ),
    ).rejects.toThrow('dua kali');
  });
});

describe('AddOnsService admin', () => {
  it('tidies the categories it stores', async () => {
    const { service, prisma } = build([]);

    await service.create({
      name: 'X',
      slug: 'x',
      price: 1,
      categories: [' Lite ', 'Lite', '', 'Premium'],
    });

    expect(prisma.addOn.create.mock.calls[0][0].data.categories).toEqual(['Lite', 'Premium']);
  });

  it('deletes one that exists and says so when it does not', async () => {
    const { service, prisma } = build([]);
    await service.remove('a1');
    expect(prisma.addOn.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });

    prisma.addOn.findUnique.mockResolvedValue(null);
    await expect(service.remove('gone')).rejects.toThrow('Add-on not found');
  });
});
