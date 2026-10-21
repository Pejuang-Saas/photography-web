import { SelectionsService } from './selections.service';

type Row = Record<string, any>;

function setup(
  options: {
    gallery?: Row | null;
    selection?: Row | null;
    validPhotos?: number;
    selected?: number;
    submittedRows?: number;
    customers?: number;
    photo?: Row | null;
    noteRows?: number;
  } = {},
) {
  const gallery =
    options.gallery === undefined
      ? {
          id: 'g1',
          name: 'Wedding',
          description: null,
          status: 'ACTIVE',
          maxSelections: 3,
          maxCustomers: null,
        }
      : options.gallery;
  const selection =
    options.selection === undefined
      ? { id: 's1', status: 'DRAFT', customerName: 'Budi', submittedAt: null }
      : options.selection;
  const prisma = {
    gallery: { findUnique: jest.fn().mockResolvedValue(gallery) },
    galleryPhoto: {
      count: jest.fn(async ({ where }: any) =>
        where.id ? (options.validPhotos ?? where.id.in.length) : where.mimeType ? 4 : 10,
      ),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(options.photo ?? { folderPath: 'edit' }),
    },
    photoRevision: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    selection: {
      create: jest.fn().mockResolvedValue({ id: 's1', sessionToken: 'sess' }),
      count: jest.fn().mockResolvedValue(options.customers ?? 0),
      findFirst: jest.fn().mockResolvedValue(selection),
      updateMany: jest.fn().mockResolvedValue({ count: options.submittedRows ?? 1 }),
      update: jest.fn().mockReturnValue('touch'),
    },
    selectionItem: {
      findMany: jest.fn().mockResolvedValue([{ photoId: 'p1' }, { photoId: 'p2' }]),
      count: jest.fn().mockResolvedValue(options.selected ?? 2),
      updateMany: jest.fn().mockResolvedValue({ count: options.noteRows ?? 1 }),
      deleteMany: jest.fn().mockReturnValue('delete'),
      createMany: jest.fn().mockReturnValue('create'),
    },
    $executeRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(async (work: unknown) =>
      typeof work === 'function' ? work(prisma) : [],
    ),
  };
  return { prisma, service: new SelectionsService(prisma as never) };
}

describe('SelectionsService: reaching a gallery', () => {
  it('shows an active gallery', async () => {
    const { service } = setup();

    expect(await service.info('tok')).toEqual({
      name: 'Wedding',
      description: null,
      totalPhotos: 10,
      totalVideos: 4,
      maxSelections: 3,
      customersFull: false,
      status: 'ACTIVE',
    });
  });

  it('does not know a token that is not a gallery', async () => {
    const { service } = setup({ gallery: null });

    await expect(service.info('nope')).rejects.toMatchObject({
      status: 404,
      response: { errorCode: 'GALLERY_NOT_FOUND' },
    });
  });

  it.each(['DRAFT', 'ARCHIVED'])('refuses a %s gallery on every route', async (status) => {
    const { service } = setup({ gallery: { id: 'g1', status } });

    for (const call of [
      () => service.info('t'),
      () => service.photos('t', {}),
      () => service.createSession('t', { customerName: 'Budi' }),
      () => service.getSession('t', 's'),
      () => service.save('t', 's', []),
      () => service.submit('t', 's'),
    ]) {
      await expect(call()).rejects.toMatchObject({
        status: 403,
        response: { errorCode: 'GALLERY_INACTIVE' },
      });
    }
  });

  it('lists only active photos, in order, and only what the customer needs', async () => {
    const { service, prisma } = setup();

    await service.photos('tok', { page: '2', limit: '500' });

    expect(prisma.galleryPhoto.findMany.mock.calls[0][0]).toMatchObject({
      where: { galleryId: 'g1', isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { filename: 'asc' }],
      skip: 100,
      take: 100,
      select: { id: true, filename: true, driveFileId: true, thumbnailUrl: true, viewUrl: true },
    });
  });
});

describe('SelectionsService: sessions', () => {
  it('starts a session with the name, and hands back the secret to resume it', async () => {
    const { service, prisma } = setup();

    expect(
      await service.createSession('tok', { customerName: '  Budi ', customerPhone: ' 0812 ' }),
    ).toEqual({
      sessionToken: 'sess',
      selectionId: 's1',
    });
    expect(prisma.selection.create.mock.calls[0][0].data).toMatchObject({
      galleryId: 'g1',
      customerName: 'Budi',
      customerEmail: null,
      customerPhone: '0812',
    });
  });

  describe('customer limit', () => {
    const limited = { id: 'g1', name: 'W', description: null, status: 'ACTIVE', maxSelections: 3 };

    it('lets customers start while there is room', async () => {
      const { service, prisma } = setup({ gallery: { ...limited, maxCustomers: 2 }, customers: 1 });

      expect(await service.createSession('tok', { customerName: 'Budi' })).toMatchObject({
        sessionToken: 'sess',
      });
      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect((await service.info('tok')).customersFull).toBe(false);
    });

    it('turns a newcomer away once every place is taken, and says the gallery is full', async () => {
      const { service, prisma } = setup({ gallery: { ...limited, maxCustomers: 2 }, customers: 2 });

      await expect(service.createSession('tok', { customerName: 'Budi' })).rejects.toMatchObject({
        status: 403,
        response: { errorCode: 'GALLERY_FULL' },
      });
      expect(prisma.selection.create).not.toHaveBeenCalled();
      expect((await service.info('tok')).customersFull).toBe(true);
    });

    it('never counts when there is no limit', async () => {
      const { service, prisma } = setup({ customers: 99 });

      await service.createSession('tok', { customerName: 'Budi' });

      expect(prisma.$executeRaw).not.toHaveBeenCalled();
      expect((await service.info('tok')).customersFull).toBe(false);
    });
  });

  it('resumes with the photos still in the gallery', async () => {
    const { service, prisma } = setup();

    expect(await service.getSession('tok', 'sess')).toMatchObject({
      status: 'DRAFT',
      customerName: 'Budi',
      selectedCount: 2,
      selectedPhotoIds: ['p1', 'p2'],
    });
    expect(prisma.selectionItem.findMany.mock.calls[0][0].where).toEqual({
      selectionId: 's1',
      photo: { isActive: true },
    });
  });

  it('only accepts a session under the gallery it was made for', async () => {
    const { service, prisma } = setup({ selection: null });

    await expect(service.getSession('tok', 'other')).rejects.toMatchObject({
      status: 404,
      response: { errorCode: 'SESSION_NOT_FOUND' },
    });
    expect(prisma.selection.findFirst.mock.calls[0][0].where).toEqual({
      sessionToken: 'other',
      galleryId: 'g1',
    });
  });
});

describe('SelectionsService.save', () => {
  it('replaces the draft with exactly the list, once per photo', async () => {
    const { service, prisma } = setup();

    expect(await service.save('tok', 'sess', ['p1', 'p2', 'p1'])).toEqual({ selectedCount: 2 });

    expect(prisma.selectionItem.deleteMany).toHaveBeenCalledWith({
      where: { selectionId: 's1', photoId: { notIn: ['p1', 'p2'] } },
    });
    expect(prisma.selectionItem.createMany).toHaveBeenCalledWith({
      data: [
        { selectionId: 's1', photoId: 'p1' },
        { selectionId: 's1', photoId: 'p2' },
      ],
      skipDuplicates: true,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('can clear the draft', async () => {
    const { service, prisma } = setup();

    await service.save('tok', 'sess', []);

    expect(prisma.selectionItem.deleteMany).toHaveBeenCalledWith({
      where: { selectionId: 's1', photoId: { notIn: [] } },
    });
  });

  it('refuses more than the limit, saying how many are allowed', async () => {
    const { service, prisma } = setup();

    await expect(service.save('tok', 'sess', ['a', 'b', 'c', 'd'])).rejects.toMatchObject({
      status: 422,
      response: { errorCode: 'SELECTION_MAX_EXCEEDED', message: expect.stringContaining('3') },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('has no limit when the gallery sets none', async () => {
    const { service } = setup({ gallery: { id: 'g1', status: 'ACTIVE', maxSelections: null } });

    await expect(
      service.save(
        'tok',
        'sess',
        Array.from({ length: 50 }, (_, i) => `p${i}`),
      ),
    ).resolves.toEqual({
      selectedCount: 50,
    });
  });

  it('refuses a photo from another gallery or one that was removed', async () => {
    const { service, prisma } = setup({ validPhotos: 1 });

    await expect(service.save('tok', 'sess', ['p1', 'foreign'])).rejects.toMatchObject({
      status: 400,
      response: { errorCode: 'PHOTO_NOT_IN_GALLERY' },
    });
    expect(prisma.galleryPhoto.count.mock.calls[0][0].where).toEqual({
      id: { in: ['p1', 'foreign'] },
      galleryId: 'g1',
      isActive: true,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('cannot change a selection that was submitted', async () => {
    const { service } = setup({
      selection: { id: 's1', status: 'SUBMITTED', customerName: 'Budi' },
    });

    await expect(service.save('tok', 'sess', ['p1'])).rejects.toMatchObject({
      status: 409,
      response: { errorCode: 'SELECTION_ALREADY_SUBMITTED' },
    });
  });
});

describe('SelectionsService.submit', () => {
  it('locks the selection and thanks the customer by name', async () => {
    const { service, prisma } = setup();

    const result = await service.submit('tok', 'sess');

    expect(result).toMatchObject({
      selectedCount: 2,
      message: 'Pilihan Anda berhasil dikirim! Terima kasih, Budi.',
    });
    expect(prisma.selection.updateMany).toHaveBeenCalledWith({
      where: { id: 's1', status: 'DRAFT' },
      data: { status: 'SUBMITTED', submittedAt: expect.any(Date), generalNote: null },
    });
  });

  it('keeps the overall note sent with the picks, trimmed', async () => {
    const { service, prisma } = setup();

    await service.submit('tok', 'sess', '  tolong dikirim hari ini ');

    expect(prisma.selection.updateMany.mock.calls[0][0].data).toMatchObject({
      generalNote: 'tolong dikirim hari ini',
    });
  });

  it('refuses an empty selection', async () => {
    const { service, prisma } = setup({ selected: 0 });

    await expect(service.submit('tok', 'sess')).rejects.toMatchObject({
      status: 400,
      response: { errorCode: 'SELECTION_EMPTY' },
    });
    expect(prisma.selection.updateMany).not.toHaveBeenCalled();
  });

  it('refuses a selection that is over a limit lowered after it was saved', async () => {
    const { service } = setup({ selected: 5 });

    await expect(service.submit('tok', 'sess')).rejects.toMatchObject({
      status: 422,
      response: { errorCode: 'SELECTION_MAX_EXCEEDED' },
    });
  });

  it('lets only one of two simultaneous submits through', async () => {
    const { service } = setup({ submittedRows: 0 });

    await expect(service.submit('tok', 'sess')).rejects.toMatchObject({
      status: 409,
      response: { errorCode: 'SELECTION_ALREADY_SUBMITTED' },
    });
  });

  it('cannot be submitted twice', async () => {
    const { service } = setup({
      selection: { id: 's1', status: 'SUBMITTED', customerName: 'Budi' },
    });

    await expect(service.submit('tok', 'sess')).rejects.toMatchObject({ status: 409 });
  });
});

describe('SelectionsService: notes and revisions', () => {
  it('saves a trimmed note on a picked photo, and clears it when blank', async () => {
    const { service, prisma } = setup();

    await service.setNote('tok', 'sess', 'p1', '  crop lebih rapat ');
    expect(prisma.selectionItem.updateMany).toHaveBeenLastCalledWith({
      where: { selectionId: 's1', photoId: 'p1' },
      data: { note: 'crop lebih rapat' },
    });

    await service.setNote('tok', 'sess', 'p1', '   ');
    expect(prisma.selectionItem.updateMany).toHaveBeenLastCalledWith({
      where: { selectionId: 's1', photoId: 'p1' },
      data: { note: null },
    });
  });

  it('refuses a note on a photo that is not picked, or after submitting', async () => {
    await expect(
      setup({ noteRows: 0 }).service.setNote('tok', 'sess', 'p1', 'x'),
    ).rejects.toMatchObject({ response: { errorCode: 'PHOTO_NOT_SELECTED' } });
    await expect(
      setup({
        selection: { id: 's1', status: 'SUBMITTED', customerName: 'Budi', submittedAt: new Date() },
      }).service.setNote('tok', 'sess', 'p1', 'x'),
    ).rejects.toMatchObject({ response: { errorCode: 'SELECTION_ALREADY_SUBMITTED' } });
  });

  it('keeps a revision request for a photo in the edit folder, even after submitting', async () => {
    const { service, prisma } = setup({
      selection: { id: 's1', status: 'SUBMITTED', customerName: 'Budi', submittedAt: new Date() },
      photo: { folderPath: 'Final/Edit' },
    });

    await service.setRevision('tok', 'sess', 'p1', ' terlalu gelap ');
    expect(prisma.photoRevision.upsert).toHaveBeenCalledWith({
      where: { selectionId_photoId: { selectionId: 's1', photoId: 'p1' } },
      create: { selectionId: 's1', photoId: 'p1', note: 'terlalu gelap' },
      update: { note: 'terlalu gelap' },
    });
  });

  it('removes the revision when the text is blank', async () => {
    const { service, prisma } = setup();

    await service.setRevision('tok', 'sess', 'p1', '  ');
    expect(prisma.photoRevision.deleteMany).toHaveBeenCalledWith({
      where: { selectionId: 's1', photoId: 'p1' },
    });
    expect(prisma.photoRevision.upsert).not.toHaveBeenCalled();
  });

  it('refuses a revision for a photo outside the edit folder', async () => {
    await expect(
      setup({ photo: { folderPath: 'Raw' } }).service.setRevision('tok', 'sess', 'p1', 'x'),
    ).rejects.toMatchObject({ response: { errorCode: 'NOT_AN_EDIT_PHOTO' } });
    await expect(
      setup({ photo: { folderPath: null } }).service.setRevision('tok', 'sess', 'p1', 'x'),
    ).rejects.toMatchObject({ response: { errorCode: 'NOT_AN_EDIT_PHOTO' } });
  });
});
