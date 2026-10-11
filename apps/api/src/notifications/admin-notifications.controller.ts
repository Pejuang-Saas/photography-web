import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { AdminNotificationsService } from './admin-notifications.service';

@Roles(['admin'])
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notifications: AdminNotificationsService) {}

  @Get()
  list(@Query('limit') limit?: string) {
    return this.notifications.list(limit ? Number(limit) : undefined);
  }

  @Post('read-all')
  @HttpCode(204)
  markAllRead() {
    return this.notifications.markAllRead();
  }

  @Patch(':id/read')
  @HttpCode(204)
  markRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(id);
  }
}
