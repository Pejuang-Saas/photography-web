import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { EmailService } from './email.service';
import { EmailSettingsService } from './email-settings.service';
import { TestEmailDto, UpdateEmailSettingsDto } from './dto/notification.dto';

@Roles(['admin'])
@Controller('admin/notification-settings')
export class NotificationsController {
  constructor(
    private readonly emailSettings: EmailSettingsService,
    private readonly email: EmailService,
  ) {}

  @Get('email')
  getEmailSettings() {
    return this.emailSettings.getAdmin();
  }

  @Patch('email')
  updateEmailSettings(@Body() dto: UpdateEmailSettingsDto) {
    return this.emailSettings.update(dto);
  }

  @Post('email/test')
  testEmail(@Body() dto: TestEmailDto) {
    return this.email.sendTest(dto.to);
  }
}
