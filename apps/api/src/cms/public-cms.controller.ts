import { Controller, Get } from '@nestjs/common';
import { CmsService } from './cms.service';

@Controller('public/cms')
export class PublicCmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('landing')
  getLandingContent() {
    return this.cmsService.getLandingContent();
  }
}
