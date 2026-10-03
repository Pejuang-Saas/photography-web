import { GatewayProvider } from '@prisma/client';
import { XenditClient } from './xendit.client';

describe('XenditClient', () => {
  const settings = {
    getGatewayCredentials: jest.fn().mockResolvedValue({
      provider: GatewayProvider.XENDIT,
      secretKey: 'xnd_development_secret',
      webhookToken: 'callback-token',
    }),
  };
  const client = new XenditClient(settings as never);

  afterEach(() => jest.restoreAllMocks());

  it('creates an invoice with server-side API key authorization', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'invoice-1', invoice_url: 'https://checkout.xendit.test/1' }),
    } as Response);

    await expect(
      client.createInvoice({
        externalId: 'ORDER-1',
        amount: 50000,
        customerName: 'Customer',
        customerEmail: 'customer@example.com',
        description: 'Session package',
      }),
    ).resolves.toEqual({
      invoiceId: 'invoice-1',
      invoiceUrl: 'https://checkout.xendit.test/1',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.xendit.co/v2/invoices',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: expect.stringContaining('Basic ') }),
      }),
    );
  });

  it('only accepts the configured callback token', async () => {
    await expect(client.verifyCallbackToken('callback-token')).resolves.toBe(true);
    await expect(client.verifyCallbackToken('forged-token')).resolves.toBe(false);
  });
});
