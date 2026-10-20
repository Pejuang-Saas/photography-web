import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { revalidateWeb } from '../common/revalidate-web';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddOnDto, UpdateAddOnDto } from './dto/add-on.dto';

/** One add-on the customer asked for, before it is checked against the package. */
export type RequestedAddOn = { addOnId: string; quantity: number };

export type PricedAddOn = {
  addOnId: string;
  name: string;
  unitLabel: string;
  unitPrice: number;
  quantity: number;
  extraMinutes: number;
  subtotal: number;
};

const sameCategory = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Whether an add-on is offered with a package of this category. */
export const appliesTo = (addOn: { categories: string[] }, category: string | null) =>
  addOn.categories.length === 0 ||
  (category !== null && addOn.categories.some((item) => sameCategory(item, category)));

@Injectable()
export class AddOnsService {
  constructor(private readonly prisma: PrismaService) {}

  list(includeInactive = false) {
    return this.prisma.addOn.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(dto: CreateAddOnDto) {
    try {
      const created = await this.prisma.addOn.create({
        data: { ...dto, categories: this.clean(dto.categories) },
      });
      void revalidateWeb();
      return created;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async update(id: string, dto: UpdateAddOnDto) {
    await this.require(id);
    try {
      const updated = await this.prisma.addOn.update({
        where: { id },
        data: { ...dto, ...(dto.categories && { categories: this.clean(dto.categories) }) },
      });
      void revalidateWeb();
      return updated;
    } catch (error) {
      throw this.translate(error);
    }
  }

  /** Old bookings keep their own copy of the add-on, so deleting one never changes them. */
  async remove(id: string) {
    await this.require(id);
    await this.prisma.addOn.delete({ where: { id } });
    void revalidateWeb();
  }

  /**
   * Prices what the customer asked for, from the add-ons as they are now. The client's own sums are
   * never trusted: only the ids and quantities are read, and each must be active, offered with this
   * package, and within its limit.
   */
  async price(
    requested: RequestedAddOn[] | undefined,
    packageItem: { category: string | null },
  ): Promise<PricedAddOn[]> {
    if (!requested || requested.length === 0) return [];
    const ids = requested.map((item) => item.addOnId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Add-on yang sama tidak boleh dipilih dua kali');
    }

    const found = await this.prisma.addOn.findMany({ where: { id: { in: ids }, isActive: true } });
    const byId = new Map(found.map((addOn) => [addOn.id, addOn]));

    return requested.map(({ addOnId, quantity }) => {
      const addOn = byId.get(addOnId);
      if (!addOn || !appliesTo(addOn, packageItem.category)) {
        throw new BadRequestException('Add-on tidak tersedia untuk paket ini');
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > addOn.maxQuantity) {
        throw new BadRequestException(
          `Jumlah ${addOn.name} harus antara 1 dan ${addOn.maxQuantity}`,
        );
      }
      return {
        addOnId: addOn.id,
        name: addOn.name,
        unitLabel: addOn.unitLabel,
        unitPrice: addOn.price,
        quantity,
        extraMinutes: addOn.extraMinutes * quantity,
        subtotal: addOn.price * quantity,
      };
    });
  }

  private clean(categories?: string[]) {
    return [...new Set((categories ?? []).map((item) => item.trim()).filter(Boolean))];
  }

  private async require(id: string) {
    const found = await this.prisma.addOn.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('Add-on not found');
  }

  private translate(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
      ? new ConflictException('Slug add-on sudah dipakai')
      : error;
  }
}
