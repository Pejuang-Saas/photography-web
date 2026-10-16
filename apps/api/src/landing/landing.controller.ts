import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { Public } from '../common/public.decorator';
import { UpdateLandingContentDto } from './dto/landing-content.dto';
import { LandingService } from './landing.service';

@Controller()
export class LandingController {
  constructor(private readonly landing: LandingService) {}

  @Public()
  @Get('public/landing-content')
  getPublic() {
    return this.landing.getContent();
  }

  @Roles(['admin'])
  @Get('admin/landing-content')
  getAdmin() {
    return this.landing.getContent();
  }

  @Roles(['admin'])
  @Patch('admin/landing-content')
  update(@Body() dto: UpdateLandingContentDto) {
    return this.landing.update(dto);
  }
}
