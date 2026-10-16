import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { revalidateWeb } from '../common/revalidate-web';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_LANDING_CONTENT } from './landing-content.defaults';
import { LandingContentData } from './landing-content.types';
import { UpdateLandingContentDto } from './dto/landing-content.dto';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Stored content layered over the defaults per section, so fields added later still get a value. */
export function mergeWithDefaults(stored: unknown): LandingContentData {
  const base = DEFAULT_LANDING_CONTENT;
  const source = isRecord(stored) ? stored : {};
  const section = <K extends keyof LandingContentData>(key: K): LandingContentData[K] => {
    const value = source[key];
    if (Array.isArray(base[key])) return (Array.isArray(value) ? value : base[key]) as never;
    return { ...(base[key] as object), ...(isRecord(value) ? value : {}) } as never;
  };

  return {
    seo: section('seo'),
    hero: section('hero'),
    portfolio: section('portfolio'),
    about: section('about'),
    packages: section('packages'),
    steps: section('steps'),
  };
}

@Injectable()
export class LandingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Reads the single content row, creating it from the defaults on first use. */
  async getContent(): Promise<LandingContentData> {
    const existing = await this.prisma.landingContent.findUnique({ where: { id: 'default' } });
    if (existing) return mergeWithDefaults(existing.content);

    try {
      await this.prisma.landingContent.create({
        data: {
          id: 'default',
          content: DEFAULT_LANDING_CONTENT as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      // A concurrent first read created it already.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
        throw error;
      }
    }
    return DEFAULT_LANDING_CONTENT;
  }

  async update(dto: UpdateLandingContentDto): Promise<LandingContentData> {
    await this.getContent();
    const content = JSON.parse(JSON.stringify(dto)) as Prisma.InputJsonValue;
    await this.prisma.landingContent.update({ where: { id: 'default' }, data: { content } });
    void revalidateWeb();
    return this.getContent();
  }
}
