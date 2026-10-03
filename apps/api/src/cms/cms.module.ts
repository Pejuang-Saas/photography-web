import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { PublicCmsController } from './public-cms.controller';

@Module({
  imports: [StorageModule],
  controllers: [CmsController, PublicCmsController],
  providers: [CmsService],
})
export class CmsModule {}
