import { Prisma } from '@prisma/client';
import { WahaError } from '../waha/waha.client';
import { WhatsappSendService } from './whatsapp-send.service';

const HOUR = 3_600_000;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR);

function setup(
  options: {
    lastInboundAt?: Date | null;
    chat?: boolean;
    sessionStatus?: string;
    recentSent?: number;
    limitEnv?: string;
    sendResult?: { id?: string };
  } = {},
) {
  const chat = {
    id: 'chat-1',
    chatId: '6281215941614@c.us',
    phone: '6281215941614',
    name: 'tann',
    lastInboundAt: options.lastInboundAt === undefined ? hoursAgo(1) : options.lastInboundAt,
  };
  const prisma = {
    whatsappChat: {
      findUnique: jest.fn().mockResolvedValue(options.chat === false ? null : chat),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    whatsappMessage: { count: jest.fn().mockResolvedValue(options.recentSent ?? 0) },
  };
  const waha = {
    getSession: jest.fn().mockResolvedValue({ status: options.sessionStatus ?? 'WORKING' }),
    sendTextToChat: jest
      .fn()
      .mockResolvedValue(options.sendResult ?? { id: 'true_6281215941614@c.us_AAA' }),
    startTyping: jest.fn().mockResolvedValue({}),
    stopTyping: jest.fn().mockResolvedValue({}),
  };
  const inbox = { ingestMessage: jest.fn().mockResolvedValue('stored') };
  const templates = {
    render: jest
      .fn()
      .mockResolvedValue({ template: { id: 't1', name: 'T' }, text: 'teks dari server' }),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === 'WHATSAPP_SEND_LIMIT_PER_MINUTE' ? options.limitEnv : undefined,
    ),
  };
  const service = new WhatsappSendService(
    prisma as never,
    waha as never,
    inbox as never,
    templates as never,
    config as never,
  );
  (service as unknown as { pause: jest.Mock }).pause = jest.fn().mockResolvedValue(undefined);
  return { service, prisma, waha, inbox, templates };
}

describe('WhatsappSendService.sendText', () => {
  it('sends free text while the 24-hour window is open', async () => {
    const { service, waha } = setup();

    const result = await service.sendText('chat-1', '  Halo kak  ');

    expect(waha.sendTextToChat).toHaveBeenCalledWith('6281215941614@c.us', 'Halo kak');
    expect(result).toEqual({ sent: true, messageId: 'true_6281215941614@c.us_AAA' });
  });

  it('refuses free text once the window has closed, and sends nothing', async () => {
    const { service, waha } = setup({ lastInboundAt: hoursAgo(30) });

    await expect(service.sendText('chat-1', 'Halo')).rejects.toMatchObject({
      status: 403,
      message: expect.stringContaining('template'),
    });
    expect(waha.sendTextToChat).not.toHaveBeenCalled();
    expect(waha.getSession).not.toHaveBeenCalled();
  });

  it('refuses free text when the customer has never written', async () => {
    const { service, waha } = setup({ lastInboundAt: null });

    await expect(service.sendText('chat-1', 'Halo')).rejects.toMatchObject({ status: 403 });
    expect(waha.sendTextToChat).not.toHaveBeenCalled();
  });

  it('refuses an empty message', async () => {
    const { service, waha } = setup();

    await expect(service.sendText('chat-1', '   ')).rejects.toMatchObject({ status: 409 });
    expect(waha.sendTextToChat).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown conversation', async () => {
    const { service } = setup({ chat: false });

    await expect(service.sendText('nope', 'Halo')).rejects.toMatchObject({ status: 404 });
  });
});

describe('WhatsappSendService.sendTemplate', () => {
  it('sends the template even when the window is closed, using text built on the server', async () => {
    const { service, waha, templates } = setup({ lastInboundAt: hoursAgo(100) });

    await service.sendTemplate('chat-1', 't1');

    expect(templates.render).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ phone: '6281215941614' }),
    );
    expect(waha.sendTextToChat).toHaveBeenCalledWith('6281215941614@c.us', 'teks dari server');
  });

  it('sends nothing when the template cannot be filled in', async () => {
    const { service, waha, templates } = setup();
    templates.render.mockRejectedValue(new Error('belum punya booking'));

    await expect(service.sendTemplate('chat-1', 't1')).rejects.toThrow('belum punya booking');
    expect(waha.sendTextToChat).not.toHaveBeenCalled();
  });

  it('previews without sending', async () => {
    const { service, waha } = setup();

    expect((await service.previewTemplate('chat-1', 't1')).text).toBe('teks dari server');
    expect(waha.sendTextToChat).not.toHaveBeenCalled();
  });
});

describe('WhatsappSendService safeguards', () => {
  it('refuses with 409 while WhatsApp is not connected', async () => {
    const { service, waha } = setup({ sessionStatus: 'SCAN_QR_CODE' });

    await expect(service.sendText('chat-1', 'Halo')).rejects.toMatchObject({ status: 409 });
    expect(waha.sendTextToChat).not.toHaveBeenCalled();
  });

  it('stops at the per-minute limit with 429, counting what the studio sent in the last minute', async () => {
    const { service, prisma, waha } = setup({ recentSent: 20 });

    await expect(service.sendText('chat-1', 'Halo')).rejects.toMatchObject({ status: 429 });

    expect(waha.sendTextToChat).not.toHaveBeenCalled();
    const where = prisma.whatsappMessage.count.mock.calls[0][0].where;
    expect(where.fromMe).toBe(true);
    expect(Date.now() - where.timestamp.gt.getTime()).toBeLessThan(61_000);
  });

  it('allows one message below the limit', async () => {
    const { service, waha } = setup({ recentSent: 19 });

    await service.sendText('chat-1', 'Halo');

    expect(waha.sendTextToChat).toHaveBeenCalled();
  });

  it('honours a lower limit from the environment, and ignores a nonsense one', async () => {
    await expect(
      setup({ recentSent: 3, limitEnv: '3' }).service.sendText('chat-1', 'Halo'),
    ).rejects.toMatchObject({ status: 429 });
    const { service, waha } = setup({ recentSent: 5, limitEnv: 'abc' });

    await service.sendText('chat-1', 'Halo');

    expect(waha.sendTextToChat).toHaveBeenCalled();
  });

  it('shows "typing…" before sending, then stops it', async () => {
    const { service, waha } = setup();
    const order: string[] = [];
    waha.startTyping.mockImplementation(async () => order.push('start'));
    waha.stopTyping.mockImplementation(async () => order.push('stop'));
    waha.sendTextToChat.mockImplementation(async () => (order.push('send'), { id: 'x' }));

    await service.sendText('chat-1', 'Halo');

    expect(order).toEqual(['start', 'stop', 'send']);
  });

  it('still sends when the typing indicator fails', async () => {
    const { service, waha } = setup();
    waha.startTyping.mockRejectedValue(new Error('not supported'));

    await service.sendText('chat-1', 'Halo');

    expect(waha.sendTextToChat).toHaveBeenCalled();
  });

  it('reports a WAHA failure as 502 with the reason', async () => {
    const { service, waha } = setup();
    waha.sendTextToChat.mockRejectedValue(
      new WahaError(422, 'WAHA POST /api/sendText gagal (422)'),
    );

    await expect(service.sendText('chat-1', 'Halo')).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining('422'),
    });
  });
});

describe('WhatsappSendService storage', () => {
  it('stores the sent message at once as an outgoing one, so it shows without waiting', async () => {
    const { service, inbox } = setup();

    await service.sendText('chat-1', 'Halo kak');

    expect(inbox.ingestMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'true_6281215941614@c.us_AAA',
        to: '6281215941614@c.us',
        fromMe: true,
        body: 'Halo kak',
      }),
    );
  });

  it('does not store anything when WAHA did not return a message id; the webhook will', async () => {
    const { service, inbox } = setup({ sendResult: {} });

    const result = await service.sendText('chat-1', 'Halo');

    expect(inbox.ingestMessage).not.toHaveBeenCalled();
    expect(result.messageId).toBeNull();
  });
});

describe('WhatsappSendService reading', () => {
  it('marks the conversation read once a reply goes out', async () => {
    const { service, prisma } = setup();

    await service.sendText('chat-1', 'Halo');

    expect(prisma.whatsappChat.updateMany).toHaveBeenCalledWith({
      where: { id: 'chat-1' },
      data: { unreadCount: 0 },
    });
  });

  it('leaves it unread when nothing was sent', async () => {
    const { service, prisma } = setup({ lastInboundAt: new Date(Date.now() - 40 * 3_600_000) });

    await expect(service.sendText('chat-1', 'Halo')).rejects.toBeDefined();

    expect(prisma.whatsappChat.updateMany).not.toHaveBeenCalled();
  });
});
