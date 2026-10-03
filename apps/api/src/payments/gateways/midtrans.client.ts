import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GatewayEnvironment } from '@prisma/client';
import { createHash, timingSafeEqual } from 'crypto';
import { PaymentSettingsService } from '../payment-settings.service';

export type MidtransSnapIntent = {
  token: string;
  redirectUrl: string;
};

@Injectable()
export class MidtransClient {
  constructor(private readonly paymentSettings: PaymentSettingsService) {}

  async createSnapIntent(input: {
    orderId: string;
    amount: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    itemName: string;
  }): Promise<MidtransSnapIntent> {
    const settings = await this.paymentSettings.getGatewayCredentials();
    if (settings.provider !== 'MIDTRANS' || !settings.serverKey) {
      throw new ServiceUnavailableException('Midtrans server key is not configured');
    }

    const baseUrl =
      settings.environment === GatewayEnvironment.PRODUCTION
        ? 'https://app.midtrans.com'
        : 'https://app.sandbox.midtrans.com';
    const basic = Buffer.from(`${settings.serverKey}:`).toString('base64');
    const response = await fetch(`${baseUrl}/snap/v1/transactions`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Basic ${basic}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: input.orderId,
          gross_amount: input.amount,
        },
        item_details: [
          {
            id: input.orderId,
            price: input.amount,
            quantity: 1,
            name: input.itemName.slice(0, 50),
          },
        ],
        customer_details: {
          first_name: input.customerName.slice(0, 50),
          email: input.customerEmail,
          phone: input.customerPhone.slice(0, 30),
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const body = (await response.json().catch(() => ({}))) as {
      token?: string;
      redirect_url?: string;
      error_messages?: string[];
    };
    if (!response.ok || !body.token || !body.redirect_url) {
      throw new ServiceUnavailableException(
        `Midtrans Snap request failed (${response.status}): ${(body.error_messages ?? []).join('; ')}`,
      );
    }

    return { token: body.token, redirectUrl: body.redirect_url };
  }

  async verifySignature(input: {
    orderId: string;
    statusCode: string;
    grossAmount: string;
    signatureKey: string;
  }) {
    const settings = await this.paymentSettings.getGatewayCredentials();
    if (settings.provider !== 'MIDTRANS' || !settings.serverKey) {
      throw new ServiceUnavailableException('Midtrans server key is not configured');
    }

    const expected = createHash('sha512')
      .update(`${input.orderId}${input.statusCode}${input.grossAmount}${settings.serverKey}`)
      .digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const actualBuffer = Buffer.from(input.signatureKey, 'utf8');
    return (
      expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
    );
  }
}
