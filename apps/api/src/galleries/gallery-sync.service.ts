import { Inject, Injectable, Logger } from '@nestjs/common';
import { SyncStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueuesService } from '../queues/queues.service';
import { galleryError } from './gallery-errors';
import { DriveSourceError, type PhotoSource } from './sources/photo-source';

export const PHOTO_SOURCE = Symbol('PHOTO_SOURCE');

const BATCH = 25;
/** A run that has shown no sign of life for this long belongs to a worker that died. */
const STALE_AFTER_MS = 10 * 60 * 1000;

@Injectable()
export class GallerySyncService {
  private readonly logger = new Logger(GallerySyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueuesService,
    @Inject(PHOTO_SOURCE) private readonly source: PhotoSource,
  ) {}

  /** Starts a sync in the background and returns at once; the admin polls `latest`. */
  async trigger(galleryId: string) {
    const gallery = await this.prisma.gallery.findUnique({ where: { id: galleryId } });
    if (!gallery) throw galleryError(404, 'GALLERY_NOT_FOUND', 'Gallery tidak ditemukan');

    const active = await this.prisma.syncJob.findFirst({
      where: { galleryId, status: { in: [SyncStatus.PENDING, SyncStatus.RUNNING] } },
      orderBy: { createdAt: 'desc' },
    });
    if (active) {
      if (Date.now() - active.updatedAt.getTime() < STALE_AFTER_MS) {
        throw galleryError(
          409,
          'SYNC_ALREADY_RUNNING',
          'Sinkronisasi masih berjalan untuk gallery ini',
        );
      }
      await this.fail(active.id, 'Sinkronisasi sebelumnya terhenti sebelum selesai');
    }

    const job = await this.prisma.syncJob.create({ data: { galleryId } });
    await this.queues.scheduleGallerySync(job.id);
    return { syncJobId: job.id };
  }

  async latest(galleryId: string) {
    const job = await this.prisma.syncJob.findFirst({
      where: { galleryId },
      orderBy: { createdAt: 'desc' },
    });
    if (!job)
      throw galleryError(404, 'SYNC_JOB_NOT_FOUND', 'Belum ada sinkronisasi untuk gallery ini');
    const percentComplete = job.totalFiles
      ? Math.min(100, Math.round((job.syncedFiles / job.totalFiles) * 100))
      : job.status === SyncStatus.COMPLETED
        ? 100
        : 0;
    return { ...job, percentComplete };
  }

  /** The worker's side: read the folder and bring the stored photos in line with it. */
  async run(syncJobId: string) {
    const job = await this.prisma.syncJob.findUnique({
      where: { id: syncJobId },
      include: { gallery: true },
    });
    // Finished, failed, or already being run: a repeat delivery must not start it over.
    if (!job || job.status !== SyncStatus.PENDING) return;
    const { gallery } = job;

    await this.prisma.syncJob.update({
      where: { id: job.id },
      data: { status: SyncStatus.RUNNING, startedAt: new Date() },
    });

    try {
      const { photos, warning } = await this.source.discover(gallery.driveFolderId);
      await this.prisma.syncJob.update({
        where: { id: job.id },
        data: { totalFiles: photos.length, warningMessage: warning ?? null },
      });

      const existing = await this.prisma.galleryPhoto.findMany({
        where: { galleryId: gallery.id },
        select: { driveFileId: true, isActive: true },
      });
      const known = new Map(existing.map((photo) => [photo.driveFileId, photo.isActive]));
      let newFiles = 0;
      let synced = 0;

      for (let start = 0; start < photos.length; start += BATCH) {
        const batch = photos.slice(start, start + BATCH);
        await this.prisma.$transaction(
          batch.map((photo, offset) => {
            const data = {
              filename: photo.filename,
              mimeType: photo.mimeType,
              thumbnailUrl: photo.thumbnailUrl,
              viewUrl: photo.viewUrl,
              sortOrder: start + offset,
              isActive: true,
            };
            return this.prisma.galleryPhoto.upsert({
              where: {
                galleryId_driveFileId: { galleryId: gallery.id, driveFileId: photo.externalId },
              },
              create: { galleryId: gallery.id, driveFileId: photo.externalId, ...data },
              update: data,
            });
          }),
        );
        // Counts a photo that came back after being removed as new: customers will see it again.
        newFiles += batch.filter((photo) => known.get(photo.externalId) !== true).length;
        synced += batch.length;
        await this.prisma.syncJob.update({
          where: { id: job.id },
          data: { syncedFiles: synced, newFiles },
        });
      }

      const present = new Set(photos.map((photo) => photo.externalId));
      const gone = existing.filter((photo) => photo.isActive && !present.has(photo.driveFileId));
      if (gone.length) {
        await this.prisma.galleryPhoto.updateMany({
          where: {
            galleryId: gallery.id,
            driveFileId: { in: gone.map((photo) => photo.driveFileId) },
          },
          data: { isActive: false },
        });
      }

      await this.prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: SyncStatus.COMPLETED,
          completedAt: new Date(),
          removedFiles: gone.length,
        },
      });
    } catch (error) {
      const message =
        error instanceof DriveSourceError
          ? error.message
          : `Sinkronisasi gagal: ${(error as Error).message}`;
      if (!(error instanceof DriveSourceError)) {
        this.logger.error(`Gallery sync ${job.id} failed: ${(error as Error).stack ?? error}`);
      }
      await this.fail(job.id, message);
    }
  }

  private fail(syncJobId: string, message: string) {
    return this.prisma.syncJob.update({
      where: { id: syncJobId },
      data: { status: SyncStatus.FAILED, errorMessage: message, completedAt: new Date() },
    });
  }
}
