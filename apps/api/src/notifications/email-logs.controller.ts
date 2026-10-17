import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { EmailLogsService } from './email-logs.service';

@Roles(['admin'])
@Controller('admin/email-logs')
export class EmailLogsController {
  constructor(private readonly logs: EmailLogsService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.logs.list({ status, search, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.logs.get(id);
  }

  @Post(':id/resend')
  @HttpCode(200)
  resend(@Param('id', ParseUUIDPipe) id: string) {
    return this.logs.resend(id);
  }
}
