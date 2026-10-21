import { Injectable } from '@nestjs/common';
import { GalleryStatus, SelectionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSessionDto } from './dto/gallery.dto';
import { galleryError, pageParams, pagination } from './gallery-errors';
import { isEditFolder } from './revision-folder';
import { browsePhotos, mediaTypeWhere, parseMediaType, parsePhotoFilter } from './photo-browse';

/** What a customer does with a gallery's public link, found by the secret in it. */
@Injectable()
export class SelectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async info(token: string) {
    const gallery = await this.activeGallery(token);
    const [totalPhotos, totalVideos, customers] = await Promise.all([
      this.prisma.galleryPhoto.count({ where: { galleryId: gallery.id, isActive: true } }),
      this.prisma.galleryPhoto.count({
        where: { galleryId: gallery.id, isActive: true, ...mediaTypeWhere('video') },
      }),
      gallery.maxCustomers === null
        ? 0
        : this.prisma.selection.count({ where: { galleryId: gallery.id } }),
    ]);
    return {
      name: gallery.name,
      description: gallery.description,
      totalPhotos,
      totalVideos,
      maxSelections: gallery.maxSelections,
      // Full: everyone who may pick has started, so a newcomer can only look.
      customersFull: gallery.maxCustomers !== null && customers >= gallery.maxCustomers,
      status: gallery.status,
    };
  }

  async photos(
    token: string,
    query: {
      page?: string;
      limit?: string;
      folder?: string;
      filter?: string;
      type?: string;
      sessionToken?: string;
    },
  ) {
    const gallery = await this.activeGallery(token);
    const { page, limit, skip } = pageParams(query.page, query.limit, { limit: 48, max: 100 });
    const filter = parsePhotoFilter(query.filter);
    // The selected / unselected tabs and the per-folder counts are about this customer's draft.
    const selection = query.sessionToken
      ? await this.prisma.selection.findFirst({
          where: { sessionToken: query.sessionToken, galleryId: gallery.id },
          select: { id: true },
        })
      : null;
    if (filter !== 'all' && !selection) {
      throw galleryError(404, 'SESSION_NOT_FOUND', 'Sesi tidak ditemukan');
    }
    return browsePhotos(this.prisma, {
      galleryId: gallery.id,
      folder: query.folder?.trim() ?? '',
      filter,
      type: parseMediaType(query.type),
      selectionId: selection?.id,
      isActive: true,
      page,
      limit,
      skip,
      select: {
        id: true,
        filename: true,
        driveFileId: true,
        thumbnailUrl: true,
        viewUrl: true,
        mimeType: true,
        folderPath: true,
      },
    });
  }

  async createSession(token: string, dto: CreateSessionDto) {
    const gallery = await this.activeGallery(token);
    const selection = await this.prisma.$transaction(async (tx) => {
      if (gallery.maxCustomers !== null) {
        // One at a time per gallery, so two customers cannot both take the last place.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${gallery.id}))`;
        const taken = await tx.selection.count({ where: { galleryId: gallery.id } });
        if (taken >= gallery.maxCustomers) {
          throw galleryError(
            403,
            'GALLERY_FULL',
            'Kuota customer untuk galeri ini sudah penuh. Anda hanya bisa melihat foto.',
          );
        }
      }
      return tx.selection.create({
        data: {
          galleryId: gallery.id,
          customerName: dto.customerName.trim(),
          customerEmail: dto.customerEmail ?? null,
          customerPhone: dto.customerPhone?.trim() || null,
        },
        select: { id: true, sessionToken: true },
      });
    });
    return { sessionToken: selection.sessionToken, selectionId: selection.id };
  }

  async getSession(token: string, sessionToken: string) {
    const { selection } = await this.session(token, sessionToken);
    const items = await this.prisma.selectionItem.findMany({
      where: { selectionId: selection.id, photo: { isActive: true } },
      select: { photoId: true, note: true },
    });
    const revisions = await this.prisma.photoRevision.findMany({
      where: { selectionId: selection.id, photo: { isActive: true } },
      select: { photoId: true, note: true },
    });
    return {
      status: selection.status,
      customerName: selection.customerName,
      selectedCount: items.length,
      selectedPhotoIds: items.map((item) => item.photoId),
      /** photoId to the customer's note, only for photos that have one. */
      notes: Object.fromEntries(
        items.flatMap((item) => (item.note ? [[item.photoId, item.note]] : [])),
      ),
      /** photoId to the revision request on an edited photo. */
      revisions: Object.fromEntries(revisions.map((row) => [row.photoId, row.note])),
      submittedAt: selection.submittedAt,
    };
  }

  /** A note on one picked photo; blank clears it. The photo must already be saved as picked. */
  async setNote(token: string, sessionToken: string, photoId: string, note: string) {
    const { selection } = await this.session(token, sessionToken);
    this.assertOpen(selection.status);

    const result = await this.prisma.selectionItem.updateMany({
      where: { selectionId: selection.id, photoId },
      data: { note: note.trim() || null },
    });
    if (result.count === 0) {
      throw galleryError(409, 'PHOTO_NOT_SELECTED', 'Pilih foto ini dulu sebelum menambah catatan');
    }
    return { saved: true };
  }

  /**
   * A revision request on an edited photo (one in the "edit" folder). It works after submitting
   * too, because the edits only arrive once the customer's picks are final. Blank removes it.
   */
  async setRevision(token: string, sessionToken: string, photoId: string, note: string) {
    const { gallery, selection } = await this.session(token, sessionToken);
    const photo = await this.prisma.galleryPhoto.findFirst({
      where: { id: photoId, galleryId: gallery.id, isActive: true },
      select: { folderPath: true },
    });
    if (!photo) {
      throw galleryError(404, 'PHOTO_NOT_FOUND', 'Foto tidak ditemukan di gallery ini');
    }
    if (!isEditFolder(photo.folderPath)) {
      throw galleryError(
        400,
        'NOT_AN_EDIT_PHOTO',
        'Revisi hanya bisa diminta untuk foto di folder "edit"',
      );
    }

    const text = note.trim();
    if (!text) {
      await this.prisma.photoRevision.deleteMany({
        where: { selectionId: selection.id, photoId },
      });
      return { saved: true };
    }
    await this.prisma.photoRevision.upsert({
      where: { selectionId_photoId: { selectionId: selection.id, photoId } },
      create: { selectionId: selection.id, photoId, note: text },
      update: { note: text },
    });
    return { saved: true };
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

  async submit(token: string, sessionToken: string, note?: string) {
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
      data: {
        status: SelectionStatus.SUBMITTED,
        submittedAt,
        generalNote: note?.trim() || null,
      },
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
