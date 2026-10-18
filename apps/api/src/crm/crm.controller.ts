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
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '@thallesp/nestjs-better-auth';
import { CrmCategoriesService } from './crm-categories.service';
import { CrmChatsService } from './crm-chats.service';
import { OpenChatDto, SendMessageDto, SendTemplateDto } from './dto/whatsapp-send.dto';
import {
  AssignCrmCategoryDto,
  CreateCrmCategoryDto,
  UpdateCrmCategoryDto,
} from './dto/crm-category.dto';
import { WhatsappMediaService } from './whatsapp-media.service';
import { WhatsappSendService } from './whatsapp-send.service';
import { WhatsappSyncService } from './whatsapp-sync.service';
import { WhatsappTemplatesService } from './whatsapp-templates.service';

@Roles(['admin'])
@Controller('admin/crm')
export class CrmController {
  constructor(
    private readonly chats: CrmChatsService,
    private readonly categories: CrmCategoriesService,
    private readonly sender: WhatsappSendService,
    private readonly media: WhatsappMediaService,
    private readonly templates: WhatsappTemplatesService,
    private readonly sync: WhatsappSyncService,
  ) {}

  @Get('chats')
  list(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.chats.list({ search, categoryId, page: Number(page), pageSize: Number(pageSize) });
  }

  /** The conversation for a booking's number, created empty if the customer has not written yet. */
  @Post('chats/open')
  @HttpCode(200)
  open(@Body() dto: OpenChatDto) {
    return this.chats.openForBooking(dto.bookingId);
  }

  @Get('chats/:id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.chats.get(id);
  }

  @Get('chats/:id/messages')
  messages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('before') before?: string,
    @Query('beforeId') beforeId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chats.messages(id, { before, beforeId, limit: Number(limit) });
  }

  /** An attachment, copied to private storage on first use and served only to signed-in admins. */
  @Get('messages/:id/media')
  async attachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.media.open(id);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'private, max-age=86400');
    const name = encodeURIComponent(file.filename);
    return new StreamableFile(file.stream, {
      type: file.contentType,
      length: file.length,
      disposition: `${file.inline ? 'inline' : 'attachment'}; filename*=UTF-8''${name}`,
    });
  }

  @Post('chats/:id/read')
  @HttpCode(204)
  markRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.chats.markRead(id);
  }

  @Get('unread')
  unread() {
    return this.chats.unreadSummary();
  }

  @Post('chats/:id/messages')
  send(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SendMessageDto) {
    return this.sender.sendText(id, dto.text);
  }

  @Post('chats/:id/send-template')
  sendTemplate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SendTemplateDto) {
    return this.sender.sendTemplate(id, dto.templateId);
  }

  @Get('chats/:id/templates/:templateId/preview')
  previewTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.sender.previewTemplate(id, templateId);
  }

  @Get('templates')
  listTemplates() {
    return this.templates.list();
  }

  @Patch('chats/:id/category')
  @HttpCode(204)
  assignCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignCrmCategoryDto) {
    return this.categories.assign(id, dto.categoryId);
  }

  @Get('categories')
  listCategories() {
    return this.categories.list();
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCrmCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCrmCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(204)
  removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.remove(id);
  }

  /** Fetches recent conversations from the connected WhatsApp session. */
  @Post('sync')
  @HttpCode(200)
  syncNow() {
    return this.sync.sync();
  }
}
