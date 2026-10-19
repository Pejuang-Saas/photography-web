import { GalleriesService, slugify } from './galleries.service';

type Row = Record<string, any>;

function setup(options: { slugs?: string[]; booking?: Row | null; gallery?: Row | null } = {}) {
  const prisma = {
    booking: {
      findUnique: jest
        .fn()
        .mockResolvedValue(options.booking === undefined ? { id: 'b1' } : options.booking),
    },
    gallery: {
      findMany: jest.fn().mockResolvedValue((options.slugs ?? []).map((slug) => ({ slug }))),
      create: jest.fn(async ({ data }: any) => ({
        id: 'g1',
        publicToken: 'tok',
        createdAt: new Date(),
        ...data,
      })),
      findUnique: jest
        .fn()
        .mockResolvedValue(
          options.gallery === undefined
            ? { id: 'g1', status: 'DRAFT', publicToken: 'tok', bookingId: null }
            : options.gallery,
        ),
      delete: jest.fn().mockResolvedValue({}),
      update: jest.fn(async ({ data }: any) => ({ id: 'g1', publicToken: 'tok', ...data })),
      count: jest.fn().mockResolvedValue(0),
    },
    syncJob: { count: jest.fn().mockResolvedValue(0) },
  };
  const config = { get: jest.fn(() => 'https://kayastory.id/') };
  return { prisma, service: new GalleriesService(prisma as never, config as never) };
}

const dto = {
  name: 'Wedding Andi & Sinta',
  driveFolderUrl: 'https://drive.google.com/drive/folders/1aBcDeFgHiJkL',
};

describe('slugify', () => {
  it.each([
    ['Wedding Andi & Sinta', 'wedding-andi-sinta'],
    ['  Wisuda Undip 2026!  ', 'wisuda-undip-2026'],
    ['Café Résumé', 'cafe-resume'],
    ['!!!', 'gallery'],
  ])('%s -> %s', (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });
});

describe('GalleriesService.create', () => {
  it('stores the folder id from the link, starts as a draft, and returns the public link', async () => {
    const { service, prisma } = setup();

    const created = await service.create(dto);

    expect(prisma.gallery.create.mock.calls[0][0].data).toMatchObject({
      name: 'Wedding Andi & Sinta',
      slug: 'wedding-andi-sinta',
      driveFolderId: '1aBcDeFgHiJkL',
      status: 'DRAFT',
      maxSelections: null,
      bookingId: null,
    });
    expect(created.publicUrl).toBe('https://kayastory.id/gallery/tok');
  });

  it('refuses a link that is not a Drive folder, with a code the web app can read', async () => {
    const { service, prisma } = setup();

    await expect(
      service.create({ ...dto, driveFolderUrl: 'https://example.com/x' }),
    ).rejects.toMatchObject({
      status: 400,
      response: { errorCode: 'DRIVE_FOLDER_INVALID' },
    });
    expect(prisma.gallery.create).not.toHaveBeenCalled();
  });

  it('numbers a slug that is already taken', async () => {
    const { service, prisma } = setup({ slugs: ['wedding-andi-sinta', 'wedding-andi-sinta-2'] });

    await service.create(dto);

    expect(prisma.gallery.create.mock.calls[0][0].data.slug).toBe('wedding-andi-sinta-3');
  });

  it('refuses a booking that does not exist', async () => {
    const { service } = setup({ booking: null });

    await expect(service.create({ ...dto, bookingId: 'nope' })).rejects.toMatchObject({
      response: { errorCode: 'BOOKING_NOT_FOUND' },
    });
  });
});

describe('GalleriesService.remove', () => {
  it('deletes a draft', async () => {
    const { service, prisma } = setup();

    await service.remove('g1');

    expect(prisma.gallery.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
  });

  it.each(['ACTIVE', 'ARCHIVED'])('refuses a %s gallery', async (status) => {
    const { service, prisma } = setup({ gallery: { id: 'g1', status, publicToken: 't' } });

    await expect(service.remove('g1')).rejects.toMatchObject({
      status: 400,
      response: { errorCode: 'GALLERY_NOT_DELETABLE' },
    });
    expect(prisma.gallery.delete).not.toHaveBeenCalled();
  });

  it('waits for a running sync', async () => {
    const { service, prisma } = setup();
    prisma.syncJob.count.mockResolvedValue(1);

    await expect(service.remove('g1')).rejects.toMatchObject({
      status: 409,
      response: { errorCode: 'GALLERY_SYNC_RUNNING' },
    });
  });

  it('says so when the gallery does not exist', async () => {
    const { service } = setup({ gallery: null });

    await expect(service.remove('g1')).rejects.toMatchObject({
      status: 404,
      response: { errorCode: 'GALLERY_NOT_FOUND' },
    });
  });
});

describe('GalleriesService.update', () => {
  it('can remove the limit with null, and leaves untouched fields alone', async () => {
    const { service, prisma } = setup();

    await service.update('g1', { maxSelections: null, name: '  Baru ' });

    expect(prisma.gallery.update.mock.calls[0][0].data).toEqual({
      name: 'Baru',
      description: undefined,
      status: undefined,
      maxSelections: null,
    });
  });
});
