import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMode, Prisma } from '@prisma/client';
import { encryptSecret } from '../common/secret-box';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateManualPaymentAccountDto,
  UpdateManualPaymentAccountDto,
  UpdatePaymentSettingsDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent() {
    return this.prisma.paymentSetting.upsert({
      where: { id: 'default' },
      create: { id: 'default', activeMode: PaymentMode.MANUAL, allowDownPayment: true },
      update: {},
    });
  }

  async getPublic() {
    const settings = await this.getCurrent();
    const manualAccounts = await this.prisma.manualPaymentAccount.findMany({
      where: { isActive: true },
      orderBy: [{ isPrimary: 'desc' }, { bankName: 'asc' }],
      select: {
        id: true,
        bankName: true,
        accountNumber: true,
        accountHolder: true,
        isPrimary: true,
      },
    });

    return {
      activeMode: settings.activeMode,
      allowDownPayment: settings.allowDownPayment,
      gatewayProvider: settings.gatewayProvider,
      gatewayEnvironment: settings.gatewayEnvironment,
      manualAccounts,
    };
  }

  async getAdmin() {
    const settings = await this.getCurrent();
    return {
      id: settings.id,
      activeMode: settings.activeMode,
      allowDownPayment: settings.allowDownPayment,
      gatewayProvider: settings.gatewayProvider,
      gatewayEnvironment: settings.gatewayEnvironment,
      merchantId: settings.merchantId,
      clientKey: settings.clientKey,
      publicKey: settings.publicKey,
      serverKeyConfigured: Boolean(settings.serverKeyEncrypted),
      secretKeyConfigured: Boolean(settings.secretKeyEncrypted),
      updatedAt: settings.updatedAt,
    };
  }

  async update(dto: UpdatePaymentSettingsDto) {
    const current = await this.getCurrent();
    const data: Prisma.PaymentSettingUpdateInput = {
      activeMode: dto.activeMode,
      allowDownPayment: dto.allowDownPayment,
      gatewayProvider: dto.gatewayProvider,
      gatewayEnvironment: dto.gatewayEnvironment,
      merchantId: dto.merchantId,
      clientKey: dto.clientKey,
      publicKey: dto.publicKey,
    };
    if (dto.serverKey) data.serverKeyEncrypted = encryptSecret(dto.serverKey);
    if (dto.secretKey) data.secretKeyEncrypted = encryptSecret(dto.secretKey);

    const settings = await this.prisma.paymentSetting.update({ where: { id: current.id }, data });
    return {
      ...settings,
      serverKeyEncrypted: undefined,
      secretKeyEncrypted: undefined,
      serverKeyConfigured: Boolean(settings.serverKeyEncrypted),
      secretKeyConfigured: Boolean(settings.secretKeyEncrypted),
    };
  }

  listAccounts() {
    return this.prisma.manualPaymentAccount.findMany({
      orderBy: [{ isPrimary: 'desc' }, { bankName: 'asc' }],
    });
  }

  createAccount(dto: CreateManualPaymentAccountDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) await tx.manualPaymentAccount.updateMany({ data: { isPrimary: false } });
      return tx.manualPaymentAccount.create({
        data: {
          ...dto,
          isActive: dto.isActive ?? true,
          isPrimary: dto.isPrimary ?? false,
        },
      });
    });
  }

  async updateAccount(id: string, dto: UpdateManualPaymentAccountDto) {
    await this.requireAccount(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.manualPaymentAccount.updateMany({
          where: { id: { not: id } },
          data: { isPrimary: false },
        });
      }
      return tx.manualPaymentAccount.update({ where: { id }, data: dto });
    });
  }

  async removeAccount(id: string) {
    await this.requireAccount(id);
    await this.prisma.manualPaymentAccount.delete({ where: { id } });
  }

  private async requireAccount(id: string) {
    const account = await this.prisma.manualPaymentAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Manual payment account not found');
    return account;
  }
}
