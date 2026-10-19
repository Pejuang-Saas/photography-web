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
import {
  SetWhatsappTemplateActiveDto,
  TestSendTemplateDto,
  WhatsappTemplateContentDto,
} from './dto/whatsapp-template.dto';
import { TEMPLATE_CATEGORIES } from './whatsapp-template-defaults';
import { WhatsappTemplatesService } from './whatsapp-templates.service';

@Roles(['admin'])
@Controller('admin/whatsapp-templates')
export class WhatsappTemplatesController {
  constructor(private readonly templates: WhatsappTemplatesService) {}

  @Get('variables')
  variables() {
    return { variables: this.templates.variables(), categories: TEMPLATE_CATEGORIES };
  }

  @Get()
  list() {
    return this.templates.adminList();
  }

  @Post('preview')
  @HttpCode(200)
  preview(@Body() dto: { body?: string }) {
    return this.templates.preview(typeof dto?.body === 'string' ? dto.body : '');
  }

  @Post('test-send')
  @HttpCode(200)
  testSend(@Body() dto: TestSendTemplateDto) {
    return this.templates.sendTest(dto.body, dto.phone);
  }

  @Post()
  create(@Body() dto: WhatsappTemplateContentDto) {
    return this.templates.create(dto);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.templates.get(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: WhatsappTemplateContentDto) {
    return this.templates.update(id, dto);
  }

  @Patch(':id/active')
  setActive(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetWhatsappTemplateActiveDto) {
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
