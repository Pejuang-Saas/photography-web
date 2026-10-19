import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '@thallesp/nestjs-better-auth';
import { CreateGalleryDto, UpdateGalleryDto } from './dto/gallery.dto';
import { GallerySyncService } from './gallery-sync.service';
import { GalleriesService } from './galleries.service';

@Roles(['admin'])
@Controller('admin/galleries')
export class GalleriesController {
  constructor(
    private readonly galleries: GalleriesService,
    private readonly sync: GallerySyncService,
  ) {}

  @Post()
  create(@Body() dto: CreateGalleryDto) {
    return this.galleries.create(dto);
  }

  @Get()
  list(@Query() query: { page?: string; limit?: string; status?: string }) {
    return this.galleries.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.galleries.get(id);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGalleryDto) {
    return this.galleries.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.galleries.remove(id);
  }

  @Post(':id/sync')
  @HttpCode(202)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  triggerSync(@Param('id', ParseUUIDPipe) id: string) {
    return this.sync.trigger(id);
  }

  @Get(':id/sync/latest')
  latestSync(@Param('id', ParseUUIDPipe) id: string) {
    return this.sync.latest(id);
  }

  @Get(':id/photos')
  photos(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: { page?: string; limit?: string; isActive?: string },
  ) {
    return this.galleries.photos(id, query);
  }

  @Get(':id/selections')
  selections(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: { page?: string; limit?: string; status?: string },
  ) {
    return this.galleries.selections(id, query);
  }

  @Get(':id/selections/:selectionId')
  selection(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('selectionId', ParseUUIDPipe) selectionId: string,
  ) {
    return this.galleries.selection(id, selectionId);
  }
}
