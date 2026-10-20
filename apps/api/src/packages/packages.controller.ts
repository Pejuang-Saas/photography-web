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
import { PackagesService } from './packages.service';
import { CreatePackageCategoryDto, UpdatePackageCategoryDto } from './dto/package-category.dto';
import { CreateServicePackageDto, UpdateServicePackageDto } from './dto/package.dto';
import { Public } from '../common/public.decorator';

@Controller()
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Public()
  @Get('public/packages')
  listPublic() {
    return this.packagesService.list();
  }

  @Public()
  @Get('public/package-categories')
  listCategoriesPublic() {
    return this.packagesService.listCategories();
  }

  @Roles(['admin'])
  @Get('admin/package-categories')
  listCategoriesAdmin() {
    return this.packagesService.listCategoriesAdmin();
  }

  @Roles(['admin'])
  @Post('admin/package-categories')
  createCategory(@Body() dto: CreatePackageCategoryDto) {
    return this.packagesService.createCategory(dto);
  }

  @Roles(['admin'])
  @Patch('admin/package-categories/:id')
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePackageCategoryDto) {
    return this.packagesService.updateCategory(id, dto);
  }

  @Roles(['admin'])
  @Delete('admin/package-categories/:id')
  @HttpCode(204)
  removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.packagesService.removeCategory(id);
  }

  @Roles(['admin'])
  @Get('admin/packages')
  listAdmin() {
    return this.packagesService.list(true);
  }

  @Roles(['admin'])
  @Post('admin/packages')
  create(@Body() dto: CreateServicePackageDto) {
    return this.packagesService.create(dto);
  }

  @Roles(['admin'])
  @Patch('admin/packages/:id')
  update(@Param('id') id: string, @Body() dto: UpdateServicePackageDto) {
    return this.packagesService.update(id, dto);
  }
}
