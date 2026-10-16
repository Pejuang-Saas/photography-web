import { Prisma } from '@prisma/client';
import { DEFAULT_LANDING_CONTENT } from './landing-content.defaults';
import { LandingService, mergeWithDefaults } from './landing.service';

jest.mock('../common/revalidate-web', () => ({ revalidateWeb: jest.fn() }));

function setup(existing: { content: unknown } | null) {
  const landingContent = {
    findUnique: jest.fn().mockResolvedValue(existing),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  };
  return { service: new LandingService({ landingContent } as never), landingContent };
}

describe('mergeWithDefaults', () => {
  it('returns the defaults for empty or malformed stored content', () => {
    expect(mergeWithDefaults(null)).toEqual(DEFAULT_LANDING_CONTENT);
    expect(mergeWithDefaults('nonsense')).toEqual(DEFAULT_LANDING_CONTENT);
  });

  it('keeps stored values and fills fields that were added after they were saved', () => {
    const merged = mergeWithDefaults({
      hero: { headlineLine1: 'Judul baru' },
      steps: [{ title: 'Satu', description: 'Saja' }],
    });

    expect(merged.hero.headlineLine1).toBe('Judul baru');
    expect(merged.hero.subtitle).toBe(DEFAULT_LANDING_CONTENT.hero.subtitle);
    expect(merged.steps).toEqual([{ title: 'Satu', description: 'Saja' }]);
    expect(merged.about.points).toEqual(DEFAULT_LANDING_CONTENT.about.points);
  });

  it('lets the admin clear a list completely instead of resurrecting the default', () => {
    expect(mergeWithDefaults({ steps: [] }).steps).toEqual([]);
  });
});

describe('LandingService', () => {
  it('writes the defaults once, on the first read only', async () => {
    const first = setup(null);
    await first.service.getContent();
    expect(first.landingContent.create).toHaveBeenCalledTimes(1);

    const later = setup({ content: DEFAULT_LANDING_CONTENT });
    await later.service.getContent();
    expect(later.landingContent.create).not.toHaveBeenCalled();
  });

  it('tolerates losing the first-read create race', async () => {
    const { service, landingContent } = setup(null);
    landingContent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );

    await expect(service.getContent()).resolves.toEqual(DEFAULT_LANDING_CONTENT);
  });

  it('stores the submitted content as-is', async () => {
    const { service, landingContent } = setup({ content: DEFAULT_LANDING_CONTENT });
    const next = { ...DEFAULT_LANDING_CONTENT, steps: [] };

    await service.update(next as never);

    expect(landingContent.update).toHaveBeenCalledWith({
      where: { id: 'default' },
      data: { content: expect.objectContaining({ steps: [] }) },
    });
  });
});
