import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServicePackageDto, UpdateServicePackageDto } from './dto/package.dto';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  list(includeInactive = false) {
    return this.prisma.servicePackage.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  create(dto: CreateServicePackageDto) {
    return this.prisma.servicePackage.create({
      data: {
        ...dto,
        durationMinutes: dto.durationMinutes ?? 60,
        maxPeople: dto.maxPeople ?? 1,
      },
    });
  }

  async update(id: string, dto: UpdateServicePackageDto) {
    await this.requireActiveOrExisting(id, false);
    return this.prisma.servicePackage.update({ where: { id }, data: dto });
  }

  async requireActive(id: string) {
    return this.requireActiveOrExisting(id, true);
  }

  async requireExisting(id: string) {
    return this.requireActiveOrExisting(id, false);
  }

  private async requireActiveOrExisting(id: string, activeOnly: boolean) {
    const packageItem = await this.prisma.servicePackage.findFirst({
      where: { id, ...(activeOnly ? { isActive: true } : {}) },
    });
    if (!packageItem) throw new NotFoundException('Package not found');
    return packageItem;
  }

  isUniqueViolation(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
