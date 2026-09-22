import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';

@Module({
  imports: [StorageModule],
  controllers: [CmsController],
  providers: [CmsService],
})
export class CmsModule {}
