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
  CreateGalleryItemUploadDto,
  CreateMarqueeItemDto,
  CreateTestimonialDto,
  CreateTestimonialUploadDto,
  UpdateFaqItemDto,
  UpdateGalleryCategoryDto,
  UpdateGalleryItemDto,
  UpdateGalleryItemUploadDto,
  UpdateMarqueeItemDto,
  UpdateTestimonialDto,
  UpdateTestimonialUploadDto,
  ReorderCmsItemDto,
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

  @Post('gallery/items/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  createGalleryItemWithImage(
    @Body() dto: CreateGalleryItemUploadDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Image file is required');
    return this.cmsService.createGalleryItemWithImage(dto, file);
  }

  @Patch('gallery/items/:id')
  updateGalleryItem(@Param('id') id: string, @Body() dto: UpdateGalleryItemDto) {
    return this.cmsService.updateGalleryItem(id, dto);
  }

  @Patch('gallery/items/:id/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  updateGalleryItemWithImage(
    @Param('id') id: string,
    @Body() dto: UpdateGalleryItemUploadDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Image file is required');
    return this.cmsService.updateGalleryItemWithImage(id, dto, file);
  }

  @Delete('gallery/items/:id')
  @HttpCode(204)
  removeGalleryItem(@Param('id') id: string) {
    return this.cmsService.removeGalleryItem(id);
  }

  @Patch('gallery/items/:id/reorder')
  reorderGalleryItem(@Param('id') id: string, @Body() dto: ReorderCmsItemDto) { return this.cmsService.reorderGalleryItem(id, dto.direction); }

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

  @Patch('marquee/:id/reorder')
  reorderMarqueeItem(@Param('id') id: string, @Body() dto: ReorderCmsItemDto) { return this.cmsService.reorderMarqueeItem(id, dto.direction); }

  @Get('testimonials')
  listTestimonials() {
    return this.cmsService.listTestimonials();
  }

  @Post('testimonials')
  createTestimonial(@Body() dto: CreateTestimonialDto) {
    return this.cmsService.createTestimonial(dto);
  }

  @Post('testimonials/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  createTestimonialWithImage(
    @Body() dto: CreateTestimonialUploadDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Image file is required');
    return this.cmsService.createTestimonialWithImage(dto, file);
  }

  @Patch('testimonials/:id')
  updateTestimonial(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) {
    return this.cmsService.updateTestimonial(id, dto);
  }

  @Patch('testimonials/:id/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  updateTestimonialWithImage(
    @Param('id') id: string,
    @Body() dto: UpdateTestimonialUploadDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Image file is required');
    return this.cmsService.updateTestimonialWithImage(id, dto, file);
  }

  @Delete('testimonials/:id')
  @HttpCode(204)
  removeTestimonial(@Param('id') id: string) {
    return this.cmsService.removeTestimonial(id);
  }

  @Patch('testimonials/:id/reorder')
  reorderTestimonial(@Param('id') id: string, @Body() dto: ReorderCmsItemDto) { return this.cmsService.reorderTestimonial(id, dto.direction); }

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

  @Patch('faqs/:id/reorder')
  reorderFaq(@Param('id') id: string, @Body() dto: ReorderCmsItemDto) { return this.cmsService.reorderFaqItem(id, dto.direction); }
}
