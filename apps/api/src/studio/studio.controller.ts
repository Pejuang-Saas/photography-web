import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { Public } from '../common/public.decorator';
import { UpdateStudioSettingsDto } from './dto/studio.dto';
import { StudioService } from './studio.service';

@Controller()
export class StudioController {
  constructor(private readonly studio: StudioService) {}

  @Public()
  @Get('public/studio-info')
  getPublic() {
    return this.studio.getPublic();
  }

  @Roles(['admin'])
  @Get('admin/studio-settings')
  getAdmin() {
    return this.studio.getAdmin();
  }

  @Roles(['admin'])
  @Patch('admin/studio-settings')
  update(@Body() dto: UpdateStudioSettingsDto) {
    return this.studio.update(dto);
  }
}
