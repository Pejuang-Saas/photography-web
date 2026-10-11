import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/public.decorator';
import { CmsService } from './cms.service';

@Public()
@Controller('public/cms')
export class PublicCmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('landing')
  getLandingContent() {
    return this.cmsService.getLandingContent();
  }
}
