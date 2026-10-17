import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEmailSettingsDto } from './dto/notification.dto';
import { readSmtpConfig } from './smtp-config';

@Injectable()
export class EmailSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  getCurrent() {
    return this.prisma.emailSetting.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
  }

  /** What the admin may change, plus a read-only view of the SMTP server set in the environment. */
  async getAdmin() {
    const settings = await this.getCurrent();
    const smtp = readSmtpConfig();
    return {
      id: settings.id,
      enabled: settings.enabled,
      autoSendInvoice: settings.autoSendInvoice,
      smtp: smtp.configured
        ? {
            configured: true as const,
            host: smtp.config.host,
            port: smtp.config.port,
            fromEmail: smtp.config.fromEmail,
            fromName: smtp.config.fromName ?? null,
            authenticated: Boolean(smtp.config.username),
          }
        : { configured: false as const, missing: smtp.missing },
      updatedAt: settings.updatedAt,
    };
  }

  async update(dto: UpdateEmailSettingsDto) {
    const current = await this.getCurrent();
    await this.prisma.emailSetting.update({
      where: { id: current.id },
      data: {
        enabled: dto.enabled,
        autoSendInvoice: dto.autoSendInvoice,
      },
    });
    return this.getAdmin();
  }
}
