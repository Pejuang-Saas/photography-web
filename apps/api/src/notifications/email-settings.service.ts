import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { encryptSecret } from '../common/secret-box';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEmailSettingsDto } from './dto/notification.dto';

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

  async getAdmin() {
    const settings = await this.getCurrent();
    return {
      id: settings.id,
      enabled: settings.enabled,
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      username: settings.username,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      adminNotificationEmail: settings.adminNotificationEmail,
      autoSendInvoice: settings.autoSendInvoice,
      passwordConfigured: Boolean(settings.passwordEncrypted),
      updatedAt: settings.updatedAt,
    };
  }

  async update(dto: UpdateEmailSettingsDto) {
    const current = await this.getCurrent();
    const data: Prisma.EmailSettingUpdateInput = {
      enabled: dto.enabled,
      host: dto.host,
      port: dto.port,
      secure: dto.secure,
      username: dto.username,
      fromEmail: dto.fromEmail,
      fromName: dto.fromName,
      adminNotificationEmail: dto.adminNotificationEmail,
      autoSendInvoice: dto.autoSendInvoice,
    };
    if (dto.password) data.passwordEncrypted = encryptSecret(dto.password);

    await this.prisma.emailSetting.update({ where: { id: current.id }, data });
    return this.getAdmin();
  }
}
