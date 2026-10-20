import { browsePhotos } from './photo-browse';

function setup(options: { counts?: unknown[]; picked?: unknown[]; total?: number } = {}) {
  const prisma = {
    galleryPhoto: {
      findMany: jest.fn().mockResolvedValue([{ id: 'p1' }]),
      count: jest.fn().mockResolvedValue(options.total ?? 1),
      groupBy: jest.fn().mockResolvedValue(options.counts ?? []),
    },
    selectionItem: { findMany: jest.fn().mockResolvedValue(options.picked ?? []) },
  };
  const run = (extra: Record<string, unknown> = {}) =>
    browsePhotos(prisma as never, {
      galleryId: 'g1',
      page: 1,
      limit: 48,
      skip: 0,
      isActive: true,
      ...extra,
    });
  return { prisma, run };
}

const count = (folderPath: string, n: number) => ({ folderPath, _count: { _all: n } });

describe('browsePhotos', () => {
  it('lists only the shared folder own photos at the root', async () => {
    const { prisma, run } = setup();
    await run({ folder: '' });
    expect(prisma.galleryPhoto.findMany.mock.calls[0][0].where).toMatchObject({
      galleryId: 'g1',
      isActive: true,
      folderPath: null,
    });
  });

  it('lists one folder own photos, not its subfolders', async () => {
    const { prisma, run } = setup();
    await run({ folder: 'Sesi 2' });
    expect(prisma.galleryPhoto.findMany.mock.calls[0][0].where.folderPath).toBe('Sesi 2');
  });

  it('lists every photo flat when no folder is given', async () => {
    const { prisma, run } = setup();
    const result = await run();
    expect(prisma.galleryPhoto.findMany.mock.calls[0][0].where).not.toHaveProperty('folderPath');
    expect(result.folders).toBeUndefined();
  });

  it('groups the folders directly inside the open one, subfolders counted in', async () => {
    const { run } = setup({
      counts: [count('A', 2), count('A/Edit', 3), count('B', 1)],
    });
    const result = await run({ folder: '' });
    expect(result.folders).toEqual([
      { name: 'A', path: 'A', count: 5, selected: 0 },
      { name: 'B', path: 'B', count: 1, selected: 0 },
    ]);
  });

  it('reads the next level when a folder is open, and counts the session picks', async () => {
    const { run } = setup({
      counts: [count('A/Edit', 3), count('A/Raw', 2)],
      picked: [{ photo: { folderPath: 'A/Edit' } }, { photo: { folderPath: 'A/Edit' } }],
    });
    const result = await run({ folder: 'A', selectionId: 's1' });
    expect(result.folders).toEqual([
      { name: 'Edit', path: 'A/Edit', count: 3, selected: 2 },
      { name: 'Raw', path: 'A/Raw', count: 2, selected: 0 },
    ]);
  });

  it('sends the folders with the first page only', async () => {
    const { prisma, run } = setup();
    const result = await run({ folder: '', page: 2, skip: 48 });
    expect(result.folders).toBeUndefined();
    expect(prisma.galleryPhoto.groupBy).not.toHaveBeenCalled();
  });

  it.each([
    ['selected', 'some'],
    ['unselected', 'none'],
  ])('the %s tab spans every folder and follows the draft', async (filter, operator) => {
    const { prisma, run } = setup();
    const result = await run({ folder: 'A', filter, selectionId: 's1' });
    const where = prisma.galleryPhoto.findMany.mock.calls[0][0].where;
    expect(where.selectionItems).toEqual({ [operator]: { selectionId: 's1' } });
    expect(where).not.toHaveProperty('folderPath');
    expect(result.folders).toBeUndefined();
  });

  it('reports pages from the total', async () => {
    const { run } = setup({ total: 130 });
    const result = await run({ folder: '' });
    expect(result).toMatchObject({ total: 130, totalPages: 3, page: 1, limit: 48 });
  });

  it('keeps only videos, or only photos, and counts a file with no type as a photo', async () => {
    const { prisma, run } = setup();
    await run({ folder: '', type: 'video' });
    expect(prisma.galleryPhoto.findMany.mock.calls[0][0].where.AND).toEqual([
      { mimeType: { startsWith: 'video/' } },
    ]);
    await run({ folder: '', type: 'photo' });
    expect(prisma.galleryPhoto.findMany.mock.calls[1][0].where.AND).toEqual([
      { OR: [{ mimeType: null }, { NOT: { mimeType: { startsWith: 'video/' } } }] },
    ]);
  });

  it('applies the type to folder counts too, so an empty folder drops out', async () => {
    const { prisma, run } = setup({ counts: [count('A', 2)] });
    await run({ folder: '', type: 'video' });
    expect(prisma.galleryPhoto.groupBy.mock.calls[0][0].where.AND).toEqual([
      { mimeType: { startsWith: 'video/' } },
    ]);
  });
});
