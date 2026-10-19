import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrmEventsService } from './crm-events.service';
import type { CreateCrmCategoryDto, UpdateCrmCategoryDto } from './dto/crm-category.dto';

@Injectable()
export class CrmCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: CrmEventsService,
  ) {}

  async list() {
    const rows = await this.prisma.crmCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { chats: true } } },
    });
    return rows.map(({ _count, ...category }) => ({ ...category, chatCount: _count.chats }));
  }

  async create(dto: CreateCrmCategoryDto) {
    const name = dto.name.trim();
    await this.assertNameFree(name);
    const last = await this.prisma.crmCategory.aggregate({ _max: { sortOrder: true } });
    const created = await this.guardUnique(() =>
      this.prisma.crmCategory.create({
        data: { name, color: dto.color, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      }),
    );
    this.events.publish({ type: 'categories' });
    return created;
  }

  async update(id: string, dto: UpdateCrmCategoryDto) {
    await this.get(id);
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name)
      throw new ConflictException('Nama kategori tidak boleh kosong');
    if (name) await this.assertNameFree(name, id);
    const updated = await this.guardUnique(() =>
      this.prisma.crmCategory.update({ where: { id }, data: { name, color: dto.color } }),
    );
    this.events.publish({ type: 'categories' });
    return updated;
  }

  /** Conversations in the category simply become uncategorised. */
  async remove(id: string) {
    await this.get(id);
    await this.prisma.crmCategory.delete({ where: { id } });
    this.events.publish({ type: 'categories' });
  }

  /** Puts a conversation in a category, or takes it out with null. */
  async assign(chatId: string, categoryId: string | null) {
    const chat = await this.prisma.whatsappChat.findUnique({
      where: { id: chatId },
      select: { id: true },
    });
    if (!chat) throw new NotFoundException('Percakapan tidak ditemukan');
    if (categoryId) await this.get(categoryId);
    await this.prisma.whatsappChat.update({ where: { id: chatId }, data: { categoryId } });
    this.events.publish({ type: 'chat', chatId });
  }

  private async get(id: string) {
    const category = await this.prisma.crmCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');
    return category;
  }

  /** "Lunas" and "lunas" are the same name to a person, so the check ignores case. */
  private async assertNameFree(name: string, exceptId?: string) {
    const clash = await this.prisma.crmCategory.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId && { id: { not: exceptId } }),
      },
      select: { id: true },
    });
    if (clash) throw new ConflictException('Nama kategori sudah dipakai');
  }

  /** Two requests can pass the check together; the database constraint settles it. */
  private async guardUnique<T>(action: () => Promise<T>) {
    try {
      return await action();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Nama kategori sudah dipakai');
      }
      throw error;
    }
  }
}
