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
} from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { CrmCategoriesService } from './crm-categories.service';
import { CrmChatsService } from './crm-chats.service';
import {
  AssignCrmCategoryDto,
  CreateCrmCategoryDto,
  UpdateCrmCategoryDto,
} from './dto/crm-category.dto';
import { WhatsappSyncService } from './whatsapp-sync.service';

@Roles(['admin'])
@Controller('admin/crm')
export class CrmController {
  constructor(
    private readonly chats: CrmChatsService,
    private readonly categories: CrmCategoriesService,
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

  @Get('chats/:id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.chats.get(id);
  }

  @Get('chats/:id/messages')
  messages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chats.messages(id, { before, limit: Number(limit) });
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
