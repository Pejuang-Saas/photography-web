import { Prisma } from '@prisma/client';
import { DEFAULT_GUARANTEES, StudioService } from './studio.service';

const row = {
  id: 'default',
  studioName: 'Kayastory Photography',
  whatsappNumber: null,
  address: null,
  mapsUrl: null,
  instagramHandle: null,
  city: null,
  region: null,
  openTime: null,
  closeTime: null,
  guarantees: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function setup(existing: typeof row | null) {
  const studioSetting = {
    findUnique: jest.fn().mockResolvedValue(existing),
    findUniqueOrThrow: jest.fn().mockResolvedValue(row),
    create: jest.fn().mockResolvedValue(row),
    update: jest.fn().mockResolvedValue(row),
  };
  return { service: new StudioService({ studioSetting } as never), studioSetting };
}

describe('StudioService', () => {
  it('creates defaults on first read, and only then', async () => {
    const first = setup(null);
    await first.service.getCurrent();
    expect(first.studioSetting.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ guarantees: DEFAULT_GUARANTEES }),
    });

    const later = setup(row);
    await later.service.getCurrent();
    expect(later.studioSetting.create).not.toHaveBeenCalled();
  });

  it('survives a concurrent first read that loses the create race', async () => {
    const { service, studioSetting } = setup(null);
    studioSetting.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );

    await expect(service.getCurrent()).resolves.toBe(row);
  });

  it('normalizes input on update and treats empty strings as clearing the value', async () => {
    const { service, studioSetting } = setup(row);

    await service.update({
      whatsappNumber: '0812-3456-7890',
      instagramHandle: '@kayastory.id',
      mapsUrl: '',
      openTime: '08:00',
      closeTime: '',
      guarantees: [' A ', ''],
    });

    expect(studioSetting.update).toHaveBeenCalledWith({
      where: { id: 'default' },
      data: expect.objectContaining({
        whatsappNumber: '6281234567890',
        instagramHandle: 'kayastory.id',
        mapsUrl: null,
        openTime: '08:00',
        closeTime: null,
        guarantees: ['A'],
      }),
    });
  });

  it('exposes a derived Instagram URL and never returns a null guarantee list', async () => {
    const { service } = setup({ ...row, instagramHandle: 'kayastory.id' });

    await expect(service.getPublic()).resolves.toMatchObject({
      instagramUrl: 'https://instagram.com/kayastory.id',
      guarantees: [],
    });
  });
});
