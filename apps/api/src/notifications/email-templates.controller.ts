import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { EmailTemplateContentDto, SetEmailTemplateActiveDto } from './dto/email-template.dto';
import { EmailTemplatesService } from './email-templates.service';

@Roles(['admin'])
@Controller('admin/email-templates')
export class EmailTemplatesController {
  constructor(private readonly templates: EmailTemplatesService) {}

  @Get('variables')
  variables() {
    return this.templates.variables();
  }

  @Get()
  list() {
    return this.templates.list();
  }

  @Post('preview')
  @HttpCode(200)
  preview(@Body() dto: EmailTemplateContentDto) {
    return this.templates.preview(dto);
  }

  @Post()
  create(@Body() dto: EmailTemplateContentDto) {
    return this.templates.create(dto);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.templates.get(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EmailTemplateContentDto) {
    return this.templates.update(id, dto);
  }

  @Patch(':id/active')
  setActive(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetEmailTemplateActiveDto) {
    return this.templates.setActive(id, dto.isActive);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templates.duplicate(id);
  }

  @Post(':id/reset')
  @HttpCode(200)
  reset(@Param('id', ParseUUIDPipe) id: string) {
    return this.templates.reset(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.templates.remove(id);
  }
}
