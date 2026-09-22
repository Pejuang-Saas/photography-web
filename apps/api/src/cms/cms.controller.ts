import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '@thallesp/nestjs-better-auth';
import { CmsService } from './cms.service';
import {
  CreateFaqItemDto,
  CreateGalleryCategoryDto,
  CreateGalleryItemDto,
  CreateMarqueeItemDto,
  CreateTestimonialDto,
  UpdateFaqItemDto,
  UpdateGalleryCategoryDto,
  UpdateGalleryItemDto,
  UpdateMarqueeItemDto,
  UpdateTestimonialDto,
} from './dto/cms.dto';

@Roles(['admin'])
@Controller('admin/cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Post('media')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadMedia(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Image file is required');
    return this.cmsService.uploadMedia(file);
  }

  @Delete('media/:id')
  @HttpCode(204)
  removeMedia(@Param('id') id: string) {
    return this.cmsService.removeMedia(id);
  }

  @Get('gallery/categories')
  listCategories() {
    return this.cmsService.listCategories();
  }

  @Post('gallery/categories')
  createCategory(@Body() dto: CreateGalleryCategoryDto) {
    return this.cmsService.createCategory(dto);
  }

  @Patch('gallery/categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateGalleryCategoryDto) {
    return this.cmsService.updateCategory(id, dto);
  }

  @Delete('gallery/categories/:id')
  @HttpCode(204)
  removeCategory(@Param('id') id: string) {
    return this.cmsService.removeCategory(id);
  }

  @Get('gallery/items')
  listGalleryItems() {
    return this.cmsService.listGalleryItems();
  }

  @Post('gallery/items')
  createGalleryItem(@Body() dto: CreateGalleryItemDto) {
    return this.cmsService.createGalleryItem(dto);
  }

  @Patch('gallery/items/:id')
  updateGalleryItem(@Param('id') id: string, @Body() dto: UpdateGalleryItemDto) {
    return this.cmsService.updateGalleryItem(id, dto);
  }

  @Delete('gallery/items/:id')
  @HttpCode(204)
  removeGalleryItem(@Param('id') id: string) {
    return this.cmsService.removeGalleryItem(id);
  }

  @Get('marquee')
  listMarqueeItems() {
    return this.cmsService.listMarqueeItems();
  }

  @Post('marquee')
  createMarqueeItem(@Body() dto: CreateMarqueeItemDto) {
    return this.cmsService.createMarqueeItem(dto);
  }

  @Patch('marquee/:id')
  updateMarqueeItem(@Param('id') id: string, @Body() dto: UpdateMarqueeItemDto) {
    return this.cmsService.updateMarqueeItem(id, dto);
  }

  @Delete('marquee/:id')
  @HttpCode(204)
  removeMarqueeItem(@Param('id') id: string) {
    return this.cmsService.removeMarqueeItem(id);
  }

  @Get('testimonials')
  listTestimonials() {
    return this.cmsService.listTestimonials();
  }

  @Post('testimonials')
  createTestimonial(@Body() dto: CreateTestimonialDto) {
    return this.cmsService.createTestimonial(dto);
  }

  @Patch('testimonials/:id')
  updateTestimonial(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) {
    return this.cmsService.updateTestimonial(id, dto);
  }

  @Delete('testimonials/:id')
  @HttpCode(204)
  removeTestimonial(@Param('id') id: string) {
    return this.cmsService.removeTestimonial(id);
  }

  @Get('faqs')
  listFaqItems() {
    return this.cmsService.listFaqItems();
  }

  @Post('faqs')
  createFaqItem(@Body() dto: CreateFaqItemDto) {
    return this.cmsService.createFaqItem(dto);
  }

  @Patch('faqs/:id')
  updateFaqItem(@Param('id') id: string, @Body() dto: UpdateFaqItemDto) {
    return this.cmsService.updateFaqItem(id, dto);
  }

  @Delete('faqs/:id')
  @HttpCode(204)
  removeFaqItem(@Param('id') id: string) {
    return this.cmsService.removeFaqItem(id);
  }
}
