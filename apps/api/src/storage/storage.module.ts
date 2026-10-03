import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageCleanupService } from './storage-cleanup.service';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [QueuesModule],
  providers: [StorageService, StorageCleanupService],
  exports: [StorageService, StorageCleanupService],
})
export class StorageModule {}
