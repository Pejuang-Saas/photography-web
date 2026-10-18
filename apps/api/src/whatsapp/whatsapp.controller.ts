import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { WhatsappConnectionService } from './whatsapp-connection.service';

@Roles(['admin'])
@Controller('admin/whatsapp')
export class WhatsappController {
  constructor(private readonly connection: WhatsappConnectionService) {}

  @Get('status')
  status() {
    return this.connection.status();
  }

  @Post('connect')
  @HttpCode(200)
  connect() {
    return this.connection.connect();
  }

  @Get('qr')
  qr() {
    return this.connection.qr();
  }

  @Post('disconnect')
  @HttpCode(200)
  disconnect() {
    return this.connection.disconnect();
  }
}
