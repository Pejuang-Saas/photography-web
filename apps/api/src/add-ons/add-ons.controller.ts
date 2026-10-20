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
import { Public } from '../common/public.decorator';
import { AddOnsService } from './add-ons.service';
import { CreateAddOnDto, UpdateAddOnDto } from './dto/add-on.dto';

@Controller()
export class AddOnsController {
  constructor(private readonly addOns: AddOnsService) {}

  @Public()
  @Get('public/add-ons')
  listPublic() {
    return this.addOns.list();
  }

  @Roles(['admin'])
  @Get('admin/add-ons')
  listAdmin() {
    return this.addOns.list(true);
  }

  @Roles(['admin'])
  @Post('admin/add-ons')
  create(@Body() dto: CreateAddOnDto) {
    return this.addOns.create(dto);
  }

  @Roles(['admin'])
  @Patch('admin/add-ons/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAddOnDto) {
    return this.addOns.update(id, dto);
  }

  @Roles(['admin'])
  @Delete('admin/add-ons/:id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.addOns.remove(id);
  }
}
