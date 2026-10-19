import { Injectable } from '@nestjs/common';
import { GalleryStatus, SelectionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSessionDto } from './dto/gallery.dto';
import { galleryError, pageParams, pagination } from './gallery-errors';

/** What a customer does with a gallery's public link, found by the secret in it. */
@Injectable()
export class SelectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async info(token: string) {
    const gallery = await this.activeGallery(token);
    const totalPhotos = await this.prisma.galleryPhoto.count({
      where: { galleryId: gallery.id, isActive: true },
    });
    return {
      name: gallery.name,
      description: gallery.description,
      totalPhotos,
      maxSelections: gallery.maxSelections,
      status: gallery.status,
    };
  }

  async photos(token: string, query: { page?: string; limit?: string }) {
    const gallery = await this.activeGallery(token);
    const { page, limit, skip } = pageParams(query.page, query.limit, { limit: 50, max: 100 });
    const where = { galleryId: gallery.id, isActive: true };
    const [items, total] = await Promise.all([
      this.prisma.galleryPhoto.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { filename: 'asc' }],
        skip,
        take: limit,
        select: {
          id: true,
          filename: true,
          driveFileId: true,
          thumbnailUrl: true,
          viewUrl: true,
        },
      }),
      this.prisma.galleryPhoto.count({ where }),
    ]);
    return { items, ...pagination(page, limit, total) };
  }

  async createSession(token: string, dto: CreateSessionDto) {
    const gallery = await this.activeGallery(token);
    const selection = await this.prisma.selection.create({
      data: {
        galleryId: gallery.id,
        customerName: dto.customerName.trim(),
        customerEmail: dto.customerEmail ?? null,
        customerPhone: dto.customerPhone?.trim() || null,
      },
      select: { id: true, sessionToken: true },
    });
    return { sessionToken: selection.sessionToken, selectionId: selection.id };
  }

  async getSession(token: string, sessionToken: string) {
    const { selection } = await this.session(token, sessionToken);
    const items = await this.prisma.selectionItem.findMany({
      where: { selectionId: selection.id, photo: { isActive: true } },
      select: { photoId: true },
    });
    return {
      status: selection.status,
      customerName: selection.customerName,
      selectedCount: items.length,
      selectedPhotoIds: items.map((item) => item.photoId),
      submittedAt: selection.submittedAt,
    };
  }

  /** Replaces the whole draft with this list, which is how the browser's debounced save works. */
  async save(token: string, sessionToken: string, photoIds: string[]) {
    const { gallery, selection } = await this.session(token, sessionToken);
    this.assertOpen(selection.status);

    const ids = [...new Set(photoIds)];
    this.assertWithinLimit(gallery.maxSelections, ids.length);
    if (ids.length) {
      const valid = await this.prisma.galleryPhoto.count({
        where: { id: { in: ids }, galleryId: gallery.id, isActive: true },
      });
      if (valid !== ids.length) {
        throw galleryError(
          400,
          'PHOTO_NOT_IN_GALLERY',
          'Ada foto yang bukan bagian dari gallery ini atau sudah dihapus',
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.selectionItem.deleteMany({
        where: { selectionId: selection.id, photoId: { notIn: ids } },
      }),
      this.prisma.selectionItem.createMany({
        data: ids.map((photoId) => ({ selectionId: selection.id, photoId })),
        skipDuplicates: true,
      }),
      this.prisma.selection.update({ where: { id: selection.id }, data: {} }),
    ]);
    return { selectedCount: ids.length };
  }

  async submit(token: string, sessionToken: string) {
    const { gallery, selection } = await this.session(token, sessionToken);
    this.assertOpen(selection.status);

    const selectedCount = await this.prisma.selectionItem.count({
      where: { selectionId: selection.id, photo: { isActive: true } },
    });
    if (selectedCount === 0) {
      throw galleryError(400, 'SELECTION_EMPTY', 'Pilih setidaknya satu foto sebelum mengirim');
    }
    this.assertWithinLimit(gallery.maxSelections, selectedCount);

    // Only a draft can be submitted, so two taps cannot both succeed.
    const submittedAt = new Date();
    const result = await this.prisma.selection.updateMany({
      where: { id: selection.id, status: SelectionStatus.DRAFT },
      data: { status: SelectionStatus.SUBMITTED, submittedAt },
    });
    if (result.count === 0) this.assertOpen(SelectionStatus.SUBMITTED);

    return {
      submittedAt,
      selectedCount,
      message: `Pilihan Anda berhasil dikirim! Terima kasih, ${selection.customerName}.`,
    };
  }

  private async activeGallery(token: string) {
    const gallery = await this.prisma.gallery.findUnique({ where: { publicToken: token } });
    if (!gallery) throw galleryError(404, 'GALLERY_NOT_FOUND', 'Gallery tidak ditemukan');
    if (gallery.status !== GalleryStatus.ACTIVE) {
      throw galleryError(403, 'GALLERY_INACTIVE', 'Gallery ini sudah tidak aktif');
    }
    return gallery;
  }

  /** A session only counts under the gallery it was made for. */
  private async session(token: string, sessionToken: string) {
    const gallery = await this.activeGallery(token);
    const selection = await this.prisma.selection.findFirst({
      where: { sessionToken, galleryId: gallery.id },
    });
    if (!selection) throw galleryError(404, 'SESSION_NOT_FOUND', 'Sesi tidak ditemukan');
    return { gallery, selection };
  }

  private assertOpen(status: SelectionStatus) {
    if (status === SelectionStatus.SUBMITTED) {
      throw galleryError(
        409,
        'SELECTION_ALREADY_SUBMITTED',
        'Pilihan sudah dikirim dan tidak bisa diubah',
      );
    }
  }

  private assertWithinLimit(max: number | null, count: number) {
    if (max !== null && count > max) {
      throw galleryError(
        422,
        'SELECTION_MAX_EXCEEDED',
        `Maksimal ${max} foto yang boleh dipilih (Anda memilih ${count})`,
      );
    }
  }
}
