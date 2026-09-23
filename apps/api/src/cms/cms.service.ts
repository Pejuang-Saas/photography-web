import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateFaqItemDto,
  CreateGalleryCategoryDto,
  CreateGalleryItemDto,
  CreateGalleryItemUploadDto,
  CreateMarqueeItemDto,
  CreateTestimonialDto,
  CreateTestimonialUploadDto,
  UpdateFaqItemDto,
  UpdateGalleryCategoryDto,
  UpdateGalleryItemDto,
  UpdateGalleryItemUploadDto,
  UpdateMarqueeItemDto,
  UpdateTestimonialDto,
  UpdateTestimonialUploadDto,
} from './dto/cms.dto';

type UploadedImage = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

const galleryInclude = {
  category: true,
  mediaAsset: true,
};

const testimonialInclude = {
  mediaAsset: true,
};

@Injectable()
export class CmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async uploadMedia(file: UploadedImage) {
    const upload = await this.storage.uploadCmsImage(file);

    try {
      return await this.prisma.$transaction((tx) =>
        tx.mediaAsset.create({ data: upload }),
      );
    } catch (error) {
      await this.removeUploadedObject(upload.key);
      throw error;
    }
  }

  async removeMedia(id: string) {
    const asset = await this.prisma.$transaction(async (tx) => {
      const mediaAsset = await tx.mediaAsset.findUnique({ where: { id } });
      if (!mediaAsset) throw new NotFoundException('Media asset not found');

      const [galleryItems, testimonials] = await Promise.all([
        tx.galleryItem.count({ where: { mediaAssetId: id } }),
        tx.testimonial.count({ where: { mediaAssetId: id } }),
      ]);

      if (galleryItems || testimonials) {
        throw new ConflictException('Media asset is still used by CMS content');
      }

      await tx.mediaAsset.delete({ where: { id } });
      return mediaAsset;
    });

    try {
      await this.storage.deleteObject(asset.key);
    } catch (error) {
      await this.prisma.mediaAsset.create({ data: asset });
      throw new InternalServerErrorException(
        'Storage deletion failed. Media metadata was restored.',
        { cause: error },
      );
    }
  }

  listCategories() {
    return this.prisma.galleryCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { galleryItems: true } } },
    });
  }

  async createCategory(dto: CreateGalleryCategoryDto) {
    const slug = await this.uniqueCategorySlug(dto.slug ?? dto.name);
    return this.prisma.galleryCategory.create({
      data: { ...dto, slug },
    });
  }

  async updateCategory(id: string, dto: UpdateGalleryCategoryDto) {
    await this.requireCategory(id);
    const slug = dto.slug
      ? await this.uniqueCategorySlug(dto.slug, id)
      : undefined;

    return this.prisma.galleryCategory.update({
      where: { id },
      data: { ...dto, slug },
    });
  }

  async removeCategory(id: string) {
    await this.prisma.$transaction(async (tx) => {
      const category = await tx.galleryCategory.findUnique({ where: { id } });
      if (!category) throw new NotFoundException('Gallery category not found');

      const galleryItems = await tx.galleryItem.count({ where: { categoryId: id } });
      if (galleryItems > 0) {
        throw new ConflictException('Gallery category is still used by gallery items');
      }

      await tx.galleryCategory.delete({ where: { id } });
    });
  }

  listGalleryItems() {
    return this.prisma.galleryItem.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: galleryInclude,
    });
  }

  async createGalleryItem(dto: CreateGalleryItemDto) {
    await this.requireMediaAsset(dto.mediaAssetId);
    if (dto.categoryId) await this.requireCategory(dto.categoryId);

    return this.prisma.galleryItem.create({
      data: {
        ...dto,
        publishedAt: dto.isPublished ? new Date() : undefined,
      },
      include: galleryInclude,
    });
  }

  async createGalleryItemWithImage(
    dto: CreateGalleryItemUploadDto,
    file: UploadedImage,
  ) {
    if (dto.categoryId) await this.requireCategory(dto.categoryId);

    const upload = await this.storage.uploadCmsImage(file);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const mediaAsset = await tx.mediaAsset.create({ data: upload });
        return tx.galleryItem.create({
          data: {
            ...dto,
            mediaAssetId: mediaAsset.id,
            publishedAt: dto.isPublished ? new Date() : undefined,
          },
          include: galleryInclude,
        });
      });
    } catch (error) {
      await this.removeUploadedObject(upload.key);
      throw error;
    }
  }

  async updateGalleryItem(id: string, dto: UpdateGalleryItemDto) {
    const current = await this.prisma.galleryItem.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Gallery item not found');
    if (dto.mediaAssetId) await this.requireMediaAsset(dto.mediaAssetId);
    if (dto.categoryId) await this.requireCategory(dto.categoryId);

    return this.prisma.galleryItem.update({
      where: { id },
      data: {
        ...dto,
        publishedAt:
          dto.isPublished === undefined
            ? undefined
            : dto.isPublished
              ? current.publishedAt ?? new Date()
              : null,
      },
      include: galleryInclude,
    });
  }

  async updateGalleryItemWithImage(
    id: string,
    dto: UpdateGalleryItemUploadDto,
    file: UploadedImage,
  ) {
    const current = await this.requireGalleryItem(id);
    if (dto.categoryId) await this.requireCategory(dto.categoryId);

    const upload = await this.storage.uploadCmsImage(file);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const mediaAsset = await tx.mediaAsset.create({ data: upload });
        return tx.galleryItem.update({
          where: { id },
          data: {
            ...dto,
            mediaAssetId: mediaAsset.id,
            publishedAt:
              dto.isPublished === undefined
                ? undefined
                : dto.isPublished
                  ? current.publishedAt ?? new Date()
                  : null,
          },
          include: galleryInclude,
        });
      });
    } catch (error) {
      await this.removeUploadedObject(upload.key);
      throw error;
    }
  }

  async removeGalleryItem(id: string) {
    await this.requireGalleryItem(id);
    await this.prisma.galleryItem.delete({ where: { id } });
  }

  async reorderGalleryItem(id: string, direction: 'up' | 'down') {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.galleryItem.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Gallery item not found');
      const ordered = await tx.galleryItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
      for (const [index, item] of ordered.entries()) if (item.sortOrder !== index) await tx.galleryItem.update({ where: { id: item.id }, data: { sortOrder: index } });
      current.sortOrder = ordered.findIndex((item) => item.id === id);
      const neighbor = await tx.galleryItem.findFirst({
        where: direction === 'up' ? { sortOrder: { lt: current.sortOrder } } : { sortOrder: { gt: current.sortOrder } },
        orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' },
      });
      if (!neighbor) return current;
      await tx.galleryItem.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } });
      return tx.galleryItem.update({ where: { id }, data: { sortOrder: neighbor.sortOrder }, include: galleryInclude });
    });
  }

  listMarqueeItems() {
    return this.prisma.marqueeItem.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  createMarqueeItem(dto: CreateMarqueeItemDto) {
    return this.prisma.marqueeItem.create({ data: dto });
  }

  async updateMarqueeItem(id: string, dto: UpdateMarqueeItemDto) {
    await this.requireMarqueeItem(id);
    return this.prisma.marqueeItem.update({ where: { id }, data: dto });
  }

  async removeMarqueeItem(id: string) {
    await this.requireMarqueeItem(id);
    await this.prisma.marqueeItem.delete({ where: { id } });
  }

  async reorderMarqueeItem(id: string, direction: 'up' | 'down') {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.marqueeItem.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Marquee item not found');
      const ordered = await tx.marqueeItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
      for (const [index, item] of ordered.entries()) if (item.sortOrder !== index) await tx.marqueeItem.update({ where: { id: item.id }, data: { sortOrder: index } });
      current.sortOrder = ordered.findIndex((item) => item.id === id);
      const neighbor = await tx.marqueeItem.findFirst({ where: direction === 'up' ? { sortOrder: { lt: current.sortOrder } } : { sortOrder: { gt: current.sortOrder } }, orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' } });
      if (!neighbor) return current;
      await tx.marqueeItem.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } });
      return tx.marqueeItem.update({ where: { id }, data: { sortOrder: neighbor.sortOrder } });
    });
  }

  listTestimonials() {
    return this.prisma.testimonial.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: testimonialInclude,
    });
  }

  async createTestimonial(dto: CreateTestimonialDto) {
    if (dto.mediaAssetId) await this.requireMediaAsset(dto.mediaAssetId);
    return this.prisma.testimonial.create({
      data: {
        ...dto,
        isPublished: dto.isPublished ?? false,
      },
      include: testimonialInclude,
    });
  }

  async createTestimonialWithImage(dto: CreateTestimonialUploadDto, file: UploadedImage) {
    const upload = await this.storage.uploadCmsImage(file);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const mediaAsset = await tx.mediaAsset.create({ data: upload });
        return tx.testimonial.create({
          data: { ...dto, mediaAssetId: mediaAsset.id, isPublished: dto.isPublished ?? false },
          include: testimonialInclude,
        });
      });
    } catch (error) {
      await this.removeUploadedObject(upload.key);
      throw error;
    }
  }

  async updateTestimonial(id: string, dto: UpdateTestimonialDto) {
    await this.requireTestimonial(id);
    if (dto.mediaAssetId) await this.requireMediaAsset(dto.mediaAssetId);
    return this.prisma.testimonial.update({
      where: { id },
      data: dto,
      include: testimonialInclude,
    });
  }

  async updateTestimonialWithImage(id: string, dto: UpdateTestimonialUploadDto, file: UploadedImage) {
    await this.requireTestimonial(id);
    const upload = await this.storage.uploadCmsImage(file);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const mediaAsset = await tx.mediaAsset.create({ data: upload });
        return tx.testimonial.update({
          where: { id },
          data: { ...dto, mediaAssetId: mediaAsset.id },
          include: testimonialInclude,
        });
      });
    } catch (error) {
      await this.removeUploadedObject(upload.key);
      throw error;
    }
  }

  async removeTestimonial(id: string) {
    await this.requireTestimonial(id);
    await this.prisma.testimonial.delete({ where: { id } });
  }

  async reorderTestimonial(id: string, direction: 'up' | 'down') {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.testimonial.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Testimonial not found');
      const ordered = await tx.testimonial.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
      for (const [index, item] of ordered.entries()) if (item.sortOrder !== index) await tx.testimonial.update({ where: { id: item.id }, data: { sortOrder: index } });
      current.sortOrder = ordered.findIndex((item) => item.id === id);
      const neighbor = await tx.testimonial.findFirst({ where: direction === 'up' ? { sortOrder: { lt: current.sortOrder } } : { sortOrder: { gt: current.sortOrder } }, orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' } });
      if (!neighbor) return current;
      await tx.testimonial.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } });
      return tx.testimonial.update({ where: { id }, data: { sortOrder: neighbor.sortOrder }, include: testimonialInclude });
    });
  }

  listFaqItems() {
    return this.prisma.faqItem.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  createFaqItem(dto: CreateFaqItemDto) {
    return this.prisma.faqItem.create({
      data: { ...dto, isPublished: dto.isPublished ?? false },
    });
  }

  async updateFaqItem(id: string, dto: UpdateFaqItemDto) {
    await this.requireFaqItem(id);
    return this.prisma.faqItem.update({ where: { id }, data: dto });
  }

  async removeFaqItem(id: string) {
    await this.requireFaqItem(id);
    await this.prisma.faqItem.delete({ where: { id } });
  }

  async reorderFaqItem(id: string, direction: 'up' | 'down') {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.faqItem.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('FAQ item not found');
      const ordered = await tx.faqItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
      for (const [index, item] of ordered.entries()) if (item.sortOrder !== index) await tx.faqItem.update({ where: { id: item.id }, data: { sortOrder: index } });
      current.sortOrder = ordered.findIndex((item) => item.id === id);
      const neighbor = await tx.faqItem.findFirst({ where: direction === 'up' ? { sortOrder: { lt: current.sortOrder } } : { sortOrder: { gt: current.sortOrder } }, orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' } });
      if (!neighbor) return current;
      await tx.faqItem.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } });
      return tx.faqItem.update({ where: { id }, data: { sortOrder: neighbor.sortOrder } });
    });
  }

  private async uniqueCategorySlug(value: string, ignoreId?: string) {
    const base = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);

    if (!base) throw new ConflictException('Category slug must contain letters or numbers');

    const existing = await this.prisma.galleryCategory.findFirst({
      where: { slug: base, id: ignoreId ? { not: ignoreId } : undefined },
    });

    if (existing) throw new ConflictException('Category slug is already in use');
    return base;
  }

  private async requireMediaAsset(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Media asset not found');
    return asset;
  }

  private async requireCategory(id: string) {
    const category = await this.prisma.galleryCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Gallery category not found');
    return category;
  }

  private async requireGalleryItem(id: string) {
    const item = await this.prisma.galleryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Gallery item not found');
    return item;
  }

  private async requireMarqueeItem(id: string) {
    const item = await this.prisma.marqueeItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Marquee item not found');
    return item;
  }

  private async requireTestimonial(id: string) {
    const item = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Testimonial not found');
    return item;
  }

  private async requireFaqItem(id: string) {
    const item = await this.prisma.faqItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('FAQ item not found');
    return item;
  }

  private async removeUploadedObject(key: string) {
    try {
      await this.storage.deleteObject(key);
    } catch {
      // The original database error remains the useful response. Storage cleanup
      // can be retried safely because object keys are generated uniquely.
    }
  }
}
