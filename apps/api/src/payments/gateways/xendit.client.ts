import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GatewayProvider } from '@prisma/client';
import { PaymentSettingsService } from '../payment-settings.service';

export type XenditInvoiceIntent = {
  invoiceId: string;
  invoiceUrl: string;
};

@Injectable()
export class XenditClient {
  constructor(private readonly paymentSettings: PaymentSettingsService) {}

  async createInvoice(input: {
    externalId: string;
    amount: number;
    customerName: string;
    customerEmail: string;
    description: string;
  }): Promise<XenditInvoiceIntent> {
    const settings = await this.paymentSettings.getGatewayCredentials();
    if (settings.provider !== GatewayProvider.XENDIT || !settings.secretKey) {
      throw new ServiceUnavailableException('Xendit secret key is not configured');
    }

    const basic = Buffer.from(`${settings.secretKey}:`).toString('base64');
    const response = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Basic ${basic}`,
      },
      body: JSON.stringify({
        external_id: input.externalId,
        amount: input.amount,
        payer_email: input.customerEmail,
        description: input.description.slice(0, 255),
        invoice_duration: 86400,
        should_send_email: false,
        customer: { given_names: input.customerName.slice(0, 120), email: input.customerEmail },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json().catch(() => ({}))) as {
      id?: string;
      invoice_url?: string;
      error_code?: string;
      message?: string;
    };
    if (!response.ok || !body.id || !body.invoice_url) {
      throw new ServiceUnavailableException(
        `Xendit invoice request failed (${response.status}): ${body.error_code ?? body.message ?? ''}`,
      );
    }
    return { invoiceId: body.id, invoiceUrl: body.invoice_url };
  }

  verifyCallbackToken(callbackToken: string | undefined) {
    return this.paymentSettings.getGatewayCredentials().then((settings) => {
      if (settings.provider !== GatewayProvider.XENDIT || !settings.webhookToken) return false;
      return callbackToken === settings.webhookToken;
    });
  }
}
