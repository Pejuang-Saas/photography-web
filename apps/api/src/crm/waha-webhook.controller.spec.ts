import { createHmac } from 'crypto';

jest.mock('../common/public.decorator', () => ({ Public: () => () => undefined }));

import { WahaWebhookController } from './waha-webhook.controller';

const secret = 'whsec';
const body = { event: 'message.any', session: 'default', payload: { id: 'm1' } };
const raw = Buffer.from(JSON.stringify(body));
const sign = (buffer = raw, key = secret) => createHmac('sha512', key).update(buffer).digest('hex');

function setup(configured: string | null = secret) {
  const webhook = { handle: jest.fn().mockResolvedValue('message:stored') };
  const config = { get: jest.fn().mockReturnValue(configured) };
  return { webhook, controller: new WahaWebhookController(config as never, webhook as never) };
}

describe('WahaWebhookController', () => {
  it('hands a correctly signed event to the webhook service', async () => {
    const { controller, webhook } = setup();

    const result = await controller.receive({ rawBody: raw } as never, sign(), 'sha512', body);

    expect(result).toEqual({ outcome: 'message:stored' });
    expect(webhook.handle).toHaveBeenCalledWith(body);
  });

  it('rejects a wrong or missing signature with 401 and processes nothing', async () => {
    const { controller, webhook } = setup();

    await expect(
      controller.receive({ rawBody: raw } as never, sign(raw, 'other'), 'sha512', body),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      controller.receive({ rawBody: raw } as never, undefined, 'sha512', body),
    ).rejects.toMatchObject({
      status: 401,
    });
    expect(webhook.handle).not.toHaveBeenCalled();
  });

  it('rejects a body that differs from the one that was signed', async () => {
    const { controller, webhook } = setup();
    const tampered = Buffer.from(JSON.stringify({ ...body, payload: { id: 'evil' } }));

    await expect(
      controller.receive({ rawBody: tampered } as never, sign(), 'sha512', body),
    ).rejects.toMatchObject({
      status: 401,
    });
    expect(webhook.handle).not.toHaveBeenCalled();
  });

  it('is unavailable, not open, while no secret is configured', async () => {
    const { controller, webhook } = setup(null);

    await expect(
      controller.receive({ rawBody: raw } as never, sign(), 'sha512', body),
    ).rejects.toMatchObject({
      status: 503,
    });
    expect(webhook.handle).not.toHaveBeenCalled();
  });

  it('answers 400 when the raw body was not captured', async () => {
    const { controller } = setup();

    await expect(controller.receive({} as never, sign(), 'sha512', body)).rejects.toMatchObject({
      status: 400,
    });
  });
});
