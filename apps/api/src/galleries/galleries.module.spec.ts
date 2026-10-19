import 'reflect-metadata';

jest.mock('@thallesp/nestjs-better-auth', () => ({
  Roles: () => () => undefined,
  AllowAnonymous: () => () => undefined,
}));
jest.mock('../queues/queues.module', () => ({ QueuesModule: class QueuesModule {} }));
jest.mock('../queues/queues.service', () => ({ QueuesService: class QueuesService {} }));

import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { QueuesService } from '../queues/queues.service';
import { GalleriesModule } from './galleries.module';
import { PHOTO_SOURCE } from './gallery-sync.service';

/**
 * Unit tests build services by hand, so a missing provider only shows up when the app starts.
 * Everything a controller or provider asks for must be provided here or be globally available.
 */
describe('GalleriesModule wiring', () => {
  const providers: any[] = Reflect.getMetadata('providers', GalleriesModule);
  const controllers: unknown[] = Reflect.getMetadata('controllers', GalleriesModule);
  const available = new Set<unknown>([
    ...providers.map((provider) => provider.provide ?? provider),
    ConfigService,
    PrismaService,
    QueuesService,
  ]);

  it.each(
    [...controllers, ...providers.filter((provider) => typeof provider === 'function')].map(
      (target) => [(target as { name: string }).name, target],
    ),
  )('can build %s', (_name, target) => {
    const dependencies: unknown[] =
      Reflect.getMetadata('design:paramtypes', target as object) ?? [];
    // Parameters injected by an explicit token (the photo source) are checked separately.
    const byToken = new Set(
      (Reflect.getMetadata('self:paramtypes', target as object) ?? []).map(
        (entry: { index: number }) => entry.index,
      ),
    );

    for (const [index, dependency] of dependencies.entries()) {
      if (byToken.has(index)) continue;
      expect({
        name: (dependency as { name?: string })?.name,
        ok: available.has(dependency),
      }).toEqual({
        name: (dependency as { name?: string })?.name,
        ok: true,
      });
    }
  });

  it('provides the photo source the sync asks for', () => {
    expect(available.has(PHOTO_SOURCE)).toBe(true);
  });
});
