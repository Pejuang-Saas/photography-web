import 'reflect-metadata';

jest.mock('@thallesp/nestjs-better-auth', () => ({
  Roles: () => () => undefined,
  AllowAnonymous: () => () => undefined,
}));

import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WahaClient } from '../waha/waha.client';
import { CrmModule } from './crm.module';

/**
 * Unit tests build services by hand, so a service missing from the module's providers only
 * shows up when the app starts. This catches that: everything a controller or provider asks for
 * must be provided by the module, or be one of the globally available services.
 */
describe('CrmModule wiring', () => {
  const providers: unknown[] = Reflect.getMetadata('providers', CrmModule);
  const controllers: unknown[] = Reflect.getMetadata('controllers', CrmModule);
  const available = new Set<unknown>([...providers, ConfigService, PrismaService, WahaClient]);

  it.each(
    [...controllers, ...providers].map((target) => [(target as { name: string }).name, target]),
  )('can build %s', (_name, target) => {
    const dependencies: unknown[] =
      Reflect.getMetadata('design:paramtypes', target as object) ?? [];

    for (const dependency of dependencies) {
      expect({
        name: (dependency as { name?: string })?.name,
        ok: available.has(dependency),
      }).toEqual({
        name: (dependency as { name?: string })?.name,
        ok: true,
      });
    }
  });
});
