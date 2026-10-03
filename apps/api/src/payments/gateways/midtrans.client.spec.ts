import { GatewayEnvironment, GatewayProvider } from '@prisma/client';
import { createHash } from 'crypto';
import { MidtransClient } from './midtrans.client';

describe('MidtransClient', () => {
  const settings = {
    getGatewayCredentials: jest.fn().mockResolvedValue({
      provider: GatewayProvider.MIDTRANS,
      environment: GatewayEnvironment.SANDBOX,
      serverKey: 'server-key',
      clientKey: 'client-key',
    }),
  };
  const client = new MidtransClient(settings as never);

  afterEach(() => jest.restoreAllMocks());

  it('accepts a valid Midtrans notification signature', async () => {
    const orderId = 'ORDER-1';
    const statusCode = '200';
    const grossAmount = '50000.00';
    const signatureKey = createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}server-key`)
      .digest('hex');

    await expect(
      client.verifySignature({ orderId, statusCode, grossAmount, signatureKey }),
    ).resolves.toBe(true);
  });

  it('rejects a forged notification signature', async () => {
    await expect(
      client.verifySignature({
        orderId: 'ORDER-1',
        statusCode: '200',
        grossAmount: '50000.00',
        signatureKey: 'forged',
      }),
    ).resolves.toBe(false);
  });

  it('creates a sandbox Snap intent with server-side authorization', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ token: 'snap-token', redirect_url: 'https://app.midtrans.test/pay' }),
    } as Response);

    await expect(
      client.createSnapIntent({
        orderId: 'ORDER-1',
        amount: 50000,
        customerName: 'Customer',
        customerEmail: 'customer@example.com',
        customerPhone: '628123456789',
        itemName: 'Session package',
      }),
    ).resolves.toEqual({
      token: 'snap-token',
      redirectUrl: 'https://app.midtrans.test/pay',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://app.sandbox.midtrans.com/snap/v1/transactions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: expect.stringContaining('Basic ') }),
      }),
    );
  });
});
