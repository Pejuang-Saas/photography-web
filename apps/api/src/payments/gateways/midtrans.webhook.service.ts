import { BadRequestException, Injectable } from '@nestjs/common';
import { GatewayProvider, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MidtransWebhookDto } from '../dto/payment.dto';
import { GatewayPaymentStateService } from './gateway-payment-state.service';
import { MidtransClient } from './midtrans.client';

@Injectable()
export class MidtransWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly midtrans: MidtransClient,
    private readonly state: GatewayPaymentStateService,
  ) {}

  async handle(dto: MidtransWebhookDto) {
    if (!(await this.midtrans.verifySignature(dto))) {
      throw new BadRequestException('Invalid Midtrans signature');
    }

    const eventKey = createHash('sha256')
      .update(
        JSON.stringify({
          orderId: dto.orderId,
          transactionId: dto.transactionId,
          transactionStatus: dto.transactionStatus,
          statusCode: dto.statusCode,
          grossAmount: dto.grossAmount,
          fraudStatus: dto.fraudStatus ?? null,
        }),
      )
      .digest('hex');
    const existing = await this.prisma.gatewayWebhookEvent.findUnique({ where: { eventKey } });
    if (existing?.status === 'PROCESSED') return { status: 'already_processed' };

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.gatewayWebhookEvent.create({
          data: {
            provider: GatewayProvider.MIDTRANS,
            eventKey,
            transactionId: dto.transactionId,
            orderId: dto.orderId,
            payload: dto as unknown as Prisma.InputJsonValue,
          },
        });

        const payment = await tx.payment.findFirst({
          where: { provider: GatewayProvider.MIDTRANS, externalReference: dto.orderId },
          include: { booking: true },
        });
        if (!payment) throw new BadRequestException('Unknown Midtrans order_id');

        const grossAmount = this.parseAmount(dto.grossAmount);
        const expectedAmount =
          payment.plan === 'FULL' ? payment.booking.totalAmount : payment.booking.requiredAmount;
        if (grossAmount !== expectedAmount) {
          throw new BadRequestException('Midtrans amount does not match the booking amount');
        }

        const metadata = { transactionId: dto.transactionId, status: dto.transactionStatus };
        if (this.isSuccessful(dto)) {
          await this.state.settle(tx, payment, metadata);
        } else if (this.isFailed(dto)) {
          await this.state.fail(
            tx,
            payment,
            `Midtrans transaction ${dto.transactionStatus}`,
            metadata,
          );
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

  private isSuccessful(dto: MidtransWebhookDto) {
    // 'authorize' is only a card pre-authorisation, not captured funds, so it is not a success.
    return (
      dto.transactionStatus === 'settlement' ||
      (dto.transactionStatus === 'capture' && dto.fraudStatus === 'accept')
    );
  }

  private isFailed(dto: MidtransWebhookDto) {
    return ['deny', 'cancel', 'expire', 'failure'].includes(dto.transactionStatus);
  }

  private parseAmount(value: string) {
    const amount = Number(value);
    if (!Number.isSafeInteger(amount) || amount < 1) {
      throw new BadRequestException('Invalid Midtrans gross_amount');
    }
    return amount;
  }

  private isUniqueViolation(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
