import { Prisma } from '@prisma/client';
import { WhatsappInboxService } from './whatsapp-inbox.service';

type Row = Record<string, any>;

/** Just enough of Prisma for the inbox: it understands the where-shapes the service uses. */
function fakePrisma() {
  const chats: Row[] = [];
  const messages: Row[] = [];
  let seq = 0;
  const dup = () =>
    new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' });

  const test = (value: any, cond: any): boolean => {
    if (cond === null) return value === null || value === undefined;
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('lt' in cond) return value != null && value < cond.lt;
      if ('lte' in cond) return value != null && value <= cond.lte;
      return false;
    }
    return value === cond;
  };
  const matches = (row: Row, where: Row): boolean =>
    Object.entries(where).every(([key, cond]) =>
      key === 'OR' ? (cond as Row[]).some((c) => matches(row, c)) : test(row[key], cond),
    );

  const prisma = {
    whatsappChat: {
      findUnique: jest.fn(async ({ where }: any) => chats.find((c) => matches(c, where)) ?? null),
      findUniqueOrThrow: jest.fn(async ({ where }: any) => chats.find((c) => matches(c, where))!),
      create: jest.fn(async ({ data }: any) => {
        if (chats.some((c) => c.chatId === data.chatId)) throw dup();
        const row = {
          id: `chat-${++seq}`,
          name: null,
          phone: null,
          lastMessageAt: null,
          lastInboundAt: null,
          lastMessagePreview: null,
          lastMessageFromMe: false,
          ...data,
        };
        chats.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) =>
        Object.assign(
          chats.find((c) => c.id === where.id)!,
          data,
        ),
      ),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const hits = chats.filter((c) => matches(c, where));
        hits.forEach((c) => Object.assign(c, data));
        return { count: hits.length };
      }),
    },
    whatsappMessage: {
      create: jest.fn(async ({ data }: any) => {
        if (messages.some((m) => m.wahaId === data.wahaId)) throw dup();
        messages.push({ ...data });
        return data;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const hits = messages.filter((m) => matches(m, where));
        hits.forEach((m) => Object.assign(m, data));
        return { count: hits.length };
      }),
    },
  };
  return { prisma, chats, messages };
}

function setup(waha: Partial<Record<string, jest.Mock>> = {}) {
  const store = fakePrisma();
  const client = {
    isConfigured: jest.fn().mockReturnValue(true),
    lidToPhone: jest.fn().mockResolvedValue(null),
    ...waha,
  };
  return {
    ...store,
    waha: client,
    service: new WhatsappInboxService(store.prisma as never, client as never),
  };
}

const T0 = 1_760_000_000; // seconds
const incoming = (id: string, at: number, body = 'halo', extra: Row = {}) => ({
  id,
  timestamp: at,
  from: '6281234567890@c.us',
  to: '6285555555555@c.us',
  fromMe: false,
  body,
  ...extra,
});
const outgoing = (id: string, at: number, body = 'balasan') => ({
  id,
  timestamp: at,
  from: '6285555555555@c.us',
  to: '6281234567890@c.us',
  fromMe: true,
  body,
});

describe('WhatsappInboxService.ingestMessage', () => {
  it('creates the conversation from the first message, with the number and the sender name', async () => {
    const { service, chats, messages } = setup();

    const result = await service.ingestMessage(
      incoming('m1', T0, 'Halo kak', { _data: { Info: { PushName: 'Anisa' } } }),
    );

    expect(result).toBe('stored');
    expect(chats).toHaveLength(1);
    expect(chats[0]).toMatchObject({
      chatId: '6281234567890@c.us',
      phone: '6281234567890',
      name: 'Anisa',
      lastMessagePreview: 'Halo kak',
      lastMessageFromMe: false,
    });
    expect(chats[0].lastInboundAt).toEqual(new Date(T0 * 1000));
    expect(messages).toHaveLength(1);
  });

  it('stores the same message once, however many times it arrives', async () => {
    const { service, messages } = setup();

    await service.ingestMessage(incoming('m1', T0));
    const again = await service.ingestMessage(incoming('m1', T0));

    expect(again).toBe('duplicate');
    expect(messages).toHaveLength(1);
  });

  it('files an outgoing message under the customer, and does not open the 24-hour window', async () => {
    const { service, chats } = setup();

    await service.ingestMessage(outgoing('m1', T0));

    expect(chats).toHaveLength(1);
    expect(chats[0].chatId).toBe('6281234567890@c.us');
    expect(chats[0].lastMessageFromMe).toBe(true);
    expect(chats[0].lastInboundAt).toBeNull();
  });

  it('opens the window only from what the customer wrote, and moves it forward', async () => {
    const { service, chats } = setup();

    await service.ingestMessage(incoming('m1', T0));
    await service.ingestMessage(outgoing('m2', T0 + 60));
    await service.ingestMessage(incoming('m3', T0 + 120));

    expect(chats[0].lastInboundAt).toEqual(new Date((T0 + 120) * 1000));
    expect(chats[0].lastMessageFromMe).toBe(false);
  });

  it('does not rewind the conversation when older history arrives later', async () => {
    const { service, chats, messages } = setup();

    await service.ingestMessage(incoming('new', T0 + 1000, 'terbaru'));
    await service.ingestMessage(incoming('old', T0, 'lama'));

    expect(messages).toHaveLength(2);
    expect(chats[0].lastMessagePreview).toBe('terbaru');
    expect(chats[0].lastMessageAt).toEqual(new Date((T0 + 1000) * 1000));
    expect(chats[0].lastInboundAt).toEqual(new Date((T0 + 1000) * 1000));
  });

  it('labels a media message without text', async () => {
    const { service, chats } = setup();

    await service.ingestMessage(incoming('m1', T0, '', { hasMedia: true }));

    expect(chats[0].lastMessagePreview).toBe('[Media]');
  });

  it('keeps a name that is already known, and never takes one from our own messages', async () => {
    const { service, chats } = setup();

    await service.ingestMessage(incoming('m1', T0, 'a', { _data: { notifyName: 'Anisa' } }));
    await service.ingestMessage(incoming('m2', T0 + 1, 'b', { _data: { notifyName: 'Ganti' } }));
    await service.ingestMessage({ ...outgoing('m3', T0 + 2), _data: { notifyName: 'Studio' } });

    expect(chats[0].name).toBe('Anisa');
  });

  it.each([
    ['a group', { ...incoming('g', T0), from: '120363025@g.us' }],
    ['a status update', { ...incoming('s', T0), from: 'status@broadcast' }],
    ['a message without id', { ...incoming('', T0) }],
    ['a message without timestamp', { ...incoming('x', T0), timestamp: undefined }],
  ])('ignores %s', async (_label, message) => {
    const { service, chats, messages } = setup();

    expect(await service.ingestMessage(message as never)).toBe('ignored');
    expect(chats).toHaveLength(0);
    expect(messages).toHaveLength(0);
  });

  it('asks WAHA for the number behind a LID and stores it', async () => {
    const { service, chats, waha } = setup({
      lidToPhone: jest.fn().mockResolvedValue('6281234567890@c.us'),
    });

    await service.ingestMessage({ ...incoming('m1', T0), from: '227183428292844@lid' });

    expect(waha.lidToPhone).toHaveBeenCalledWith('227183428292844@lid');
    expect(chats[0]).toMatchObject({ chatId: '227183428292844@lid', phone: '6281234567890' });
  });

  it('still stores the message when the LID cannot be resolved, and retries on the next one', async () => {
    const lidToPhone = jest
      .fn()
      .mockRejectedValueOnce(new Error('WAHA down'))
      .mockResolvedValueOnce('6281234567890@c.us');
    const { service, chats, messages } = setup({ lidToPhone });
    const lid = '227183428292844@lid';

    await service.ingestMessage({ ...incoming('m1', T0), from: lid });
    expect(chats[0].phone).toBeNull();
    expect(messages).toHaveLength(1);

    await service.ingestMessage({ ...incoming('m2', T0 + 5), from: lid });
    expect(chats[0].phone).toBe('6281234567890');
  });

  it('does not call WAHA for a normal number', async () => {
    const { service, waha } = setup();

    await service.ingestMessage(incoming('m1', T0));

    expect(waha.lidToPhone).not.toHaveBeenCalled();
  });
});

describe('WhatsappInboxService.ingestAck', () => {
  it('moves a message forward from sent to delivered to read, never back', async () => {
    const { service, messages } = setup();
    await service.ingestMessage(outgoing('m1', T0));

    await service.ingestAck('m1', 2);
    expect(messages[0].ack).toBe(2);
    await service.ingestAck('m1', 3);
    expect(messages[0].ack).toBe(3);
    await service.ingestAck('m1', 1);
    expect(messages[0].ack).toBe(3);
  });

  it('records an error only while the message has not been delivered', async () => {
    const { service, messages } = setup();
    await service.ingestMessage(outgoing('m1', T0));
    await service.ingestMessage(outgoing('m2', T0 + 1));

    await service.ingestAck('m1', -1);
    await service.ingestAck('m2', 3);
    await service.ingestAck('m2', -1);

    expect(messages[0].ack).toBe(-1);
    expect(messages[1].ack).toBe(3);
  });

  it('ignores a receipt without an id or a number', async () => {
    const { service, prisma } = setup();

    await service.ingestAck(undefined, 2);
    await service.ingestAck('m1', undefined);

    expect(prisma.whatsappMessage.updateMany).not.toHaveBeenCalled();
  });
});
