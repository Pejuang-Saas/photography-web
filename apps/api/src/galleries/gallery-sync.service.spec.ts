jest.mock('../queues/queues.service', () => ({ QueuesService: class QueuesService {} }));

import { DriveSourceError } from './sources/photo-source';
import { GallerySyncService } from './gallery-sync.service';

type Row = Record<string, any>;

const photo = (id: string, filename = `${id}.jpg`) => ({
  externalId: id,
  filename,
  mimeType: 'image/jpeg',
  thumbnailUrl: `t-${id}`,
  viewUrl: `v-${id}`,
});

function setup(
  options: {
    photos?: Row[];
    existing?: Row[];
    discoverError?: Error;
    warning?: string;
    active?: Row | null;
  } = {},
) {
  const job: Row = { id: 'job1', galleryId: 'g1', status: 'PENDING', syncedFiles: 0, newFiles: 0 };
  const stored: Row[] = [...(options.existing ?? [])];
  const prisma = {
    gallery: { findUnique: jest.fn().mockResolvedValue({ id: 'g1', driveFolderId: 'folder' }) },
    syncJob: {
      findFirst: jest.fn().mockResolvedValue(options.active ?? null),
      create: jest.fn().mockResolvedValue({ id: 'job1' }),
      findUnique: jest.fn(async () => ({ ...job, gallery: { id: 'g1', driveFolderId: 'folder' } })),
      update: jest.fn(async ({ data }: any) => Object.assign(job, data)),
    },
    galleryPhoto: {
      findMany: jest.fn(async () => stored.map((row) => ({ ...row }))),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const id = where.galleryId_driveFileId.driveFileId;
        const row = stored.find((item) => item.driveFileId === id);
        if (row) Object.assign(row, update);
        else stored.push({ driveFileId: id, ...create });
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        for (const row of stored) {
          if (where.driveFileId.in.includes(row.driveFileId)) Object.assign(row, data);
        }
      }),
    },
    $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  const queues = { scheduleGallerySync: jest.fn().mockResolvedValue({}) };
  const source = {
    discover: jest.fn(async () => {
      if (options.discoverError) throw options.discoverError;
      return { photos: options.photos ?? [], warning: options.warning };
    }),
  };
  return {
    job,
    stored,
    prisma,
    queues,
    source,
    service: new GallerySyncService(prisma as never, queues as never, source as never),
  };
}

describe('GallerySyncService.trigger', () => {
  it('records the run and queues it, answering at once', async () => {
    const { service, prisma, queues } = setup();

    expect(await service.trigger('g1')).toEqual({ syncJobId: 'job1' });

    expect(prisma.syncJob.create).toHaveBeenCalledWith({ data: { galleryId: 'g1' } });
    expect(queues.scheduleGallerySync).toHaveBeenCalledWith('job1');
  });

  it('refuses a second sync while one is running', async () => {
    const { service, queues } = setup({ active: { id: 'old', updatedAt: new Date() } });

    await expect(service.trigger('g1')).rejects.toMatchObject({
      status: 409,
      response: { errorCode: 'SYNC_ALREADY_RUNNING' },
    });
    expect(queues.scheduleGallerySync).not.toHaveBeenCalled();
  });

  it('replaces a run that stopped long ago, marking it failed', async () => {
    const { service, prisma } = setup({
      active: { id: 'old', updatedAt: new Date(Date.now() - 11 * 60 * 1000) },
    });

    await service.trigger('g1');

    expect(prisma.syncJob.update).toHaveBeenCalledWith({
      where: { id: 'old' },
      data: expect.objectContaining({ status: 'FAILED' }),
    });
    expect(prisma.syncJob.create).toHaveBeenCalled();
  });

  it('says so when the gallery does not exist', async () => {
    const { service, prisma } = setup();
    prisma.gallery.findUnique.mockResolvedValue(null);

    await expect(service.trigger('g1')).rejects.toMatchObject({ status: 404 });
  });
});

describe('GallerySyncService.run', () => {
  it('stores every photo in name order and counts them as new', async () => {
    const { service, job, stored } = setup({ photos: [photo('a'), photo('b'), photo('c')] });

    await service.run('job1');

    expect(job).toMatchObject({
      status: 'COMPLETED',
      totalFiles: 3,
      syncedFiles: 3,
      newFiles: 3,
      removedFiles: 0,
    });
    expect(stored.map((row) => [row.driveFileId, row.sortOrder, row.isActive])).toEqual([
      ['a', 0, true],
      ['b', 1, true],
      ['c', 2, true],
    ]);
  });

  it('deactivates what left the folder and counts it, without touching the rest', async () => {
    const { service, job, stored } = setup({
      photos: [photo('a')],
      existing: [
        { driveFileId: 'a', isActive: true },
        { driveFileId: 'gone', isActive: true },
        { driveFileId: 'already', isActive: false },
      ],
    });

    await service.run('job1');

    expect(job).toMatchObject({ newFiles: 0, removedFiles: 1 });
    expect(stored.find((row) => row.driveFileId === 'gone')!.isActive).toBe(false);
  });

  it('brings back a photo that returned to the folder, as a new one', async () => {
    const { service, job, stored } = setup({
      photos: [photo('back')],
      existing: [{ driveFileId: 'back', isActive: false }],
    });

    await service.run('job1');

    expect(job.newFiles).toBe(1);
    expect(stored[0].isActive).toBe(true);
  });

  it('works through a large folder in batches, reporting progress as it goes', async () => {
    const many = Array.from({ length: 60 }, (_, index) =>
      photo(`p${String(index).padStart(2, '0')}`),
    );
    const { service, prisma, job } = setup({ photos: many });

    await service.run('job1');

    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    expect(job).toMatchObject({ syncedFiles: 60, newFiles: 60 });
  });

  it('keeps a warning from the source on a sync that worked', async () => {
    const { service, job } = setup({ photos: [photo('a')], warning: 'hanya 50 file' });

    await service.run('job1');

    expect(job).toMatchObject({ status: 'COMPLETED', warningMessage: 'hanya 50 file' });
  });

  it('records a Drive problem as the reason, in words the admin can act on', async () => {
    const { service, job, stored } = setup({
      discoverError: new DriveSourceError('DRIVE_FOLDER_PRIVATE', 'Folder belum dibagikan'),
      existing: [{ driveFileId: 'a', isActive: true }],
    });

    await service.run('job1');

    expect(job).toMatchObject({ status: 'FAILED', errorMessage: 'Folder belum dibagikan' });
    expect(stored[0].isActive).toBe(true);
  });

  it('records an unexpected failure without losing the run', async () => {
    const { service, job } = setup({ discoverError: new Error('boom') });

    await service.run('job1');

    expect(job).toMatchObject({ status: 'FAILED', errorMessage: 'Sinkronisasi gagal: boom' });
  });

  it('ignores a repeat delivery of a run that already started or finished', async () => {
    const { service, job, source } = setup({ photos: [photo('a')] });
    job.status = 'RUNNING';

    await service.run('job1');

    expect(source.discover).not.toHaveBeenCalled();
  });
});

describe('GallerySyncService.latest', () => {
  it('reports progress as a percentage', async () => {
    const { service, prisma } = setup();
    prisma.syncJob.findFirst.mockResolvedValue({
      id: 'j',
      status: 'RUNNING',
      totalFiles: 500,
      syncedFiles: 250,
    });

    expect(await service.latest('g1')).toMatchObject({ percentComplete: 50 });
  });

  it('is 0 before the folder has been read, and 100 for a finished run', async () => {
    const { service, prisma } = setup();
    prisma.syncJob.findFirst.mockResolvedValueOnce({
      status: 'RUNNING',
      totalFiles: null,
      syncedFiles: 0,
    });
    prisma.syncJob.findFirst.mockResolvedValueOnce({
      status: 'COMPLETED',
      totalFiles: 0,
      syncedFiles: 0,
    });

    expect((await service.latest('g1')).percentComplete).toBe(0);
    expect((await service.latest('g1')).percentComplete).toBe(100);
  });

  it('says so when nothing has been synced yet', async () => {
    const { service, prisma } = setup();
    prisma.syncJob.findFirst.mockResolvedValue(null);

    await expect(service.latest('g1')).rejects.toMatchObject({
      status: 404,
      response: { errorCode: 'SYNC_JOB_NOT_FOUND' },
    });
  });
});
