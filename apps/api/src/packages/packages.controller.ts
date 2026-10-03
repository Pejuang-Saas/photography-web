import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { PackagesService } from './packages.service';
import { CreateServicePackageDto, UpdateServicePackageDto } from './dto/package.dto';

@Controller()
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get('public/packages')
  listPublic() {
    return this.packagesService.list();
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
