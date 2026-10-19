import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueuesModule } from '../queues/queues.module';
import { GalleriesController } from './galleries.controller';
import { GalleriesService } from './galleries.service';
import { GallerySyncService, PHOTO_SOURCE } from './gallery-sync.service';
import { PublicGalleriesController } from './public-galleries.controller';
import { SelectionsService } from './selections.service';
import { GoogleDrivePublicSource } from './sources/google-drive-public/google-drive-public.source';

@Module({
  imports: [ConfigModule, QueuesModule],
  controllers: [GalleriesController, PublicGalleriesController],
  providers: [
    GalleriesService,
    GallerySyncService,
    SelectionsService,
    GoogleDrivePublicSource,
    // Swap this to read from somewhere other than Google Drive; nothing else knows about Drive.
    { provide: PHOTO_SOURCE, useExisting: GoogleDrivePublicSource },
  ],
  exports: [GallerySyncService],
})
export class GalleriesModule {}
