import { BadRequestException, Injectable } from '@nestjs/common';
import { GatewayProvider, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { XenditWebhookDto } from '../dto/payment.dto';
import { XenditClient } from './xendit.client';
import { GatewayPaymentStateService } from './gateway-payment-state.service';

@Injectable()
export class XenditWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xendit: XenditClient,
    private readonly state: GatewayPaymentStateService,
  ) {}

  async handle(dto: XenditWebhookDto, callbackToken: string | undefined, webhookId?: string) {
    if (!(await this.xendit.verifyCallbackToken(callbackToken))) {
      throw new BadRequestException('Invalid Xendit callback token');
    }
    const eventKey =
      webhookId ??
      createHash('sha256')
        .update(
          JSON.stringify({
            externalId: dto.externalId,
            invoiceId: dto.id,
            status: dto.status,
            amount: dto.amount,
          }),
        )
        .digest('hex');
    const existing = await this.prisma.gatewayWebhookEvent.findUnique({ where: { eventKey } });
    if (existing?.status === 'PROCESSED') return { status: 'already_processed' };

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.gatewayWebhookEvent.create({
          data: {
            provider: GatewayProvider.XENDIT,
            eventKey,
            transactionId: dto.id,
            orderId: dto.externalId,
            payload: dto as unknown as Prisma.InputJsonValue,
          },
        });
        const payment = await tx.payment.findFirst({
          where: { provider: GatewayProvider.XENDIT, externalReference: dto.externalId },
          include: { booking: true },
        });
        if (!payment) throw new BadRequestException('Unknown Xendit external_id');
        if (dto.amount !== payment.amount) {
          throw new BadRequestException('Xendit amount does not match the booking amount');
        }
        if (dto.status === 'PAID') {
          await this.state.settle(tx, payment, {
            invoiceId: dto.id,
            status: dto.status,
          });
        } else if (dto.status === 'EXPIRED') {
          await this.state.fail(tx, payment, 'Xendit invoice expired', {
            invoiceId: dto.id,
            status: dto.status,
          });
        }
        await tx.gatewayWebhookEvent.update({
          where: { eventKey },
          data: { status: 'PROCESSED', processedAt: new Date(), error: null },
        });
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) return { status: 'already_processed' };
      throw error;
    }
    return { status: 'processed' };
  }

  private isUniqueViolation(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
