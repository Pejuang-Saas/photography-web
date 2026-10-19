import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GalleryStatus, Prisma, SelectionStatus, SyncStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateGalleryDto, UpdateGalleryDto } from './dto/gallery.dto';
import { galleryError, pageParams, pagination } from './gallery-errors';
import { extractFolderId } from './sources/google-drive-public/google-drive-public.parser';

/** "Wedding Andi & Sinta" becomes "wedding-andi-sinta". */
export function slugify(name: string) {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'gallery';
}

@Injectable()
export class GalleriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** The link the admin sends to the customer. */
  publicUrl(publicToken: string) {
    const base = (this.config.get<string>('WEB_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
    return `${base}/gallery/${publicToken}`;
  }

  async create(dto: CreateGalleryDto) {
    const driveFolderId = extractFolderId(dto.driveFolderUrl);
    if (!driveFolderId) {
      throw galleryError(
        400,
        'DRIVE_FOLDER_INVALID',
        'Alamat folder Google Drive tidak dikenali. Contoh: https://drive.google.com/drive/folders/…',
      );
    }
    if (dto.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: dto.bookingId },
        select: { id: true },
      });
      if (!booking) throw galleryError(400, 'BOOKING_NOT_FOUND', 'Booking tidak ditemukan');
    }

    const gallery = await this.prisma.gallery.create({
      data: {
        name: dto.name.trim(),
        slug: await this.freeSlug(dto.name),
        driveFolderId,
        description: dto.description ?? null,
        maxSelections: dto.maxSelections ?? null,
        bookingId: dto.bookingId ?? null,
        status: dto.status ?? GalleryStatus.DRAFT,
      },
    });
    return this.present(gallery);
  }

  async list(query: { page?: string; limit?: string; status?: string }) {
    const { page, limit, skip } = pageParams(query.page, query.limit);
    const where: Prisma.GalleryWhereInput =
      query.status && query.status in GalleryStatus
        ? { status: query.status as GalleryStatus }
        : {};

    const [galleries, total] = await Promise.all([
      this.prisma.gallery.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.gallery.count({ where }),
    ]);

    // Counted for the whole page at once rather than per gallery.
    const ids = galleries.map((gallery) => gallery.id);
    const [photos, submissions, syncs] = await Promise.all([
      this.prisma.galleryPhoto.groupBy({
        by: ['galleryId'],
        where: { galleryId: { in: ids }, isActive: true },
        _count: { _all: true },
      }),
      this.prisma.selection.groupBy({
        by: ['galleryId'],
        where: { galleryId: { in: ids }, status: SelectionStatus.SUBMITTED },
        _count: { _all: true },
      }),
      this.prisma.syncJob.groupBy({
        by: ['galleryId'],
        where: { galleryId: { in: ids }, status: SyncStatus.COMPLETED },
        _max: { completedAt: true },
      }),
    ]);
    const photoCount = new Map(photos.map((row) => [row.galleryId, row._count._all]));
    const submissionCount = new Map(submissions.map((row) => [row.galleryId, row._count._all]));
    const lastSync = new Map(syncs.map((row) => [row.galleryId, row._max.completedAt]));

    return {
      items: galleries.map((gallery) => ({
        ...this.present(gallery),
        totalPhotos: photoCount.get(gallery.id) ?? 0,
        totalSubmissions: submissionCount.get(gallery.id) ?? 0,
        lastSyncAt: lastSync.get(gallery.id) ?? null,
      })),
      ...pagination(page, limit, total),
    };
  }

  async get(id: string) {
    const gallery = await this.find(id);
    const [
      totalPhotos,
      activePhotos,
      selections,
      submitted,
      selectedPhotos,
      latestSyncJob,
      booking,
    ] = await Promise.all([
      this.prisma.galleryPhoto.count({ where: { galleryId: id } }),
      this.prisma.galleryPhoto.count({ where: { galleryId: id, isActive: true } }),
      this.prisma.selection.count({ where: { galleryId: id } }),
      this.prisma.selection.count({
        where: { galleryId: id, status: SelectionStatus.SUBMITTED },
      }),
      this.prisma.selectionItem.count({ where: { selection: { galleryId: id } } }),
      this.prisma.syncJob.findFirst({
        where: { galleryId: id },
        orderBy: { createdAt: 'desc' },
      }),
      gallery.bookingId
        ? this.prisma.booking.findUnique({
            where: { id: gallery.bookingId },
            select: { id: true, bookingCode: true, customerName: true },
          })
        : null,
    ]);
    return {
      ...this.present(gallery),
      totalPhotos,
      totalActivePhotos: activePhotos,
      totalSelections: selections,
      totalSubmissions: submitted,
      totalSelectedPhotos: selectedPhotos,
      booking,
      latestSyncJob,
    };
  }

  async update(id: string, dto: UpdateGalleryDto) {
    await this.find(id);
    const gallery = await this.prisma.gallery.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description,
        status: dto.status,
        maxSelections: dto.maxSelections,
      },
    });
    return this.present(gallery);
  }

  async remove(id: string) {
    const gallery = await this.find(id);
    if (gallery.status !== GalleryStatus.DRAFT) {
      throw galleryError(
        400,
        'GALLERY_NOT_DELETABLE',
        'Hanya gallery berstatus DRAFT yang bisa dihapus. Arsipkan gallery yang sudah aktif.',
      );
    }
    const syncing = await this.prisma.syncJob.count({
      where: { galleryId: id, status: { in: [SyncStatus.PENDING, SyncStatus.RUNNING] } },
    });
    if (syncing) {
      throw galleryError(
        409,
        'GALLERY_SYNC_RUNNING',
        'Tunggu sinkronisasi selesai sebelum menghapus',
      );
    }
    await this.prisma.gallery.delete({ where: { id } });
  }

  async photos(id: string, query: { page?: string; limit?: string; isActive?: string }) {
    await this.find(id);
    const { page, limit, skip } = pageParams(query.page, query.limit, { limit: 50, max: 100 });
    const where: Prisma.GalleryPhotoWhereInput = {
      galleryId: id,
      ...(query.isActive === 'true' && { isActive: true }),
      ...(query.isActive === 'false' && { isActive: false }),
    };
    const [items, total] = await Promise.all([
      this.prisma.galleryPhoto.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { filename: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.galleryPhoto.count({ where }),
    ]);
    return { items, ...pagination(page, limit, total) };
  }

  async selections(id: string, query: { page?: string; limit?: string; status?: string }) {
    await this.find(id);
    const { page, limit, skip } = pageParams(query.page, query.limit);
    const where: Prisma.SelectionWhereInput = {
      galleryId: id,
      ...(query.status &&
        query.status in SelectionStatus && {
          status: query.status as SelectionStatus,
        }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.selection.findMany({
        where,
        orderBy: [{ submittedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: { _count: { select: { items: true } } },
      }),
      this.prisma.selection.count({ where }),
    ]);
    return {
      items: rows.map(({ _count, sessionToken: _token, ...selection }) => ({
        ...selection,
        selectedCount: _count.items,
      })),
      ...pagination(page, limit, total),
    };
  }

  async selection(id: string, selectionId: string) {
    await this.find(id);
    const row = await this.prisma.selection.findFirst({
      where: { id: selectionId, galleryId: id },
      include: {
        items: {
          include: { photo: true },
          orderBy: [{ photo: { sortOrder: 'asc' } }, { photo: { filename: 'asc' } }],
        },
      },
    });
    if (!row) throw galleryError(404, 'SELECTION_NOT_FOUND', 'Pilihan customer tidak ditemukan');
    const { items, sessionToken: _token, ...selection } = row;
    return { ...selection, selectedPhotos: items.map((item) => item.photo) };
  }

  /** The gallery, or a 404 the web app can recognise. */
  async find(id: string) {
    const gallery = await this.prisma.gallery.findUnique({ where: { id } });
    if (!gallery) throw galleryError(404, 'GALLERY_NOT_FOUND', 'Gallery tidak ditemukan');
    return gallery;
  }

  private present<T extends { publicToken: string }>(gallery: T) {
    return { ...gallery, publicUrl: this.publicUrl(gallery.publicToken) };
  }

  /** A readable slug that is not taken yet: "wedding", then "wedding-2", "wedding-3". */
  private async freeSlug(name: string) {
    const base = slugify(name);
    const taken = await this.prisma.gallery.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
    });
    const used = new Set(taken.map((row) => row.slug));
    if (!used.has(base)) return base;
    for (let n = 2; ; n += 1) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
  }
}
