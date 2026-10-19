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
      findFirst: jest.fn(
        async ({ where }: any) =>
          chats.find(
            (c) =>
              c.phone === where.phone &&
              c.chatId.endsWith('@c.us') &&
              !messages.some((m) => m.chatId === c.id),
          ) ?? null,
      ),
      create: jest.fn(async ({ data }: any) => {
        if (chats.some((c) => c.chatId === data.chatId)) throw dup();
        const row = {
          id: `chat-${++seq}`,
          name: null,
          phone: null,
          unreadCount: 0,
          lastMessageAt: null,
          lastInboundAt: null,
          lastMessagePreview: null,
          lastMessageFromMe: false,
          ...data,
        };
        chats.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = chats.find((c) => c.id === where.id)!;
        for (const [key, value] of Object.entries(data)) {
          row[key] =
            value && typeof value === 'object' && 'increment' in (value as object)
              ? (row[key] ?? 0) + (value as { increment: number }).increment
              : value;
        }
        return row;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const hits = chats.filter((c) => matches(c, where));
        hits.forEach((c) => Object.assign(c, data));
        return { count: hits.length };
      }),
    },
    whatsappMessage: {
      create: jest.fn(async ({ data }: any) => {
        if (messages.some((m) => m.wahaId === data.wahaId)) throw dup();
        const row = { id: `msg-${messages.length + 1}`, ...data };
        messages.push(row);
        return { id: row.id };
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
  const media = { prefetch: jest.fn() };
  return {
    ...store,
    waha: client,
    media,
    service: new WhatsappInboxService(store.prisma as never, client as never, media as never),
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

  it('moves the conversation in the inbox only as far as its newest message', async () => {
    const { service, chats } = setup();

    await service.ingestMessage(incoming('new', T0 + 1000));
    await service.ingestMessage(incoming('old', T0));

    expect(chats[0].lastActivityAt).toEqual(new Date((T0 + 1000) * 1000));
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

describe('WhatsappInboxService placeholder conversations', () => {
  it('moves an empty conversation opened for a booking onto the LID, instead of making a second one', async () => {
    const { service, chats } = setup({
      lidToPhone: jest.fn().mockResolvedValue('6281234567890@c.us'),
    });
    chats.push({
      id: 'placeholder',
      chatId: '6281234567890@c.us',
      phone: '6281234567890',
      name: 'Anisa Booking',
      lastMessageAt: null,
      lastInboundAt: null,
    });

    await service.ingestMessage({ ...incoming('m1', T0), from: '227183428292844@lid' });

    expect(chats).toHaveLength(1);
    expect(chats[0]).toMatchObject({
      id: 'placeholder',
      chatId: '227183428292844@lid',
      name: 'Anisa Booking',
    });
  });

  it('leaves a conversation that already has messages alone', async () => {
    const { service, chats, messages } = setup({
      lidToPhone: jest.fn().mockResolvedValue('6281234567890@c.us'),
    });
    chats.push({
      id: 'old',
      chatId: '6281234567890@c.us',
      phone: '6281234567890',
      name: null,
      lastMessageAt: null,
      lastInboundAt: null,
    });
    messages.push({ wahaId: 'earlier', chatId: 'old' });

    await service.ingestMessage({ ...incoming('m1', T0), from: '227183428292844@lid' });

    expect(chats).toHaveLength(2);
    expect(chats.find((c) => c.id === 'old')?.chatId).toBe('6281234567890@c.us');
  });
});

describe('WhatsappInboxService groups', () => {
  const GROUP = '120363429116882627@g.us';
  const ME_LID = '176330318553252@lid';

  it('ignores a group message the studio sent, which the engine reports with its own id in "to"', async () => {
    const { service, chats, messages } = setup();

    const result = await service.ingestMessage({
      id: `true_${GROUP}_3AE6B91D0EC238405AA2_${ME_LID}`,
      timestamp: T0,
      from: ME_LID,
      to: ME_LID,
      fromMe: true,
      body: 'lebih di gas lagi ya gais',
    });

    expect(result).toBe('ignored');
    expect(chats).toHaveLength(0);
    expect(messages).toHaveLength(0);
  });

  it('ignores a group message someone else wrote', async () => {
    const { service, chats } = setup();

    const result = await service.ingestMessage({
      id: `false_${GROUP}_3AA1_227183428292844@lid`,
      timestamp: T0,
      from: GROUP,
      to: ME_LID,
      fromMe: false,
      body: 'halo semua',
    });

    expect(result).toBe('ignored');
    expect(chats).toHaveLength(0);
  });

  it('ignores a message whose from or to is a group even when the id cannot be read', async () => {
    const { service, chats } = setup();

    expect(
      await service.ingestMessage({
        id: 'odd-id',
        timestamp: T0,
        from: GROUP,
        to: ME_LID,
        fromMe: false,
      }),
    ).toBe('ignored');
    expect(
      await service.ingestMessage({
        id: 'odd-id-2',
        timestamp: T0,
        from: ME_LID,
        to: GROUP,
        fromMe: true,
      }),
    ).toBe('ignored');
    expect(chats).toHaveLength(0);
  });

  it('still stores a private message that has a normal id', async () => {
    const { service, chats } = setup();

    expect(
      await service.ingestMessage({ ...incoming('false_6281234567890@c.us_3EB0AA', T0) }),
    ).toBe('stored');
    expect(chats).toHaveLength(1);
  });
});

describe('WhatsappInboxService unread messages', () => {
  const LIVE = { live: true };

  it('counts a customer message as unread when it arrives live', async () => {
    const { service, chats } = setup();

    await service.ingestMessage(incoming('m1', T0), undefined, LIVE);
    await service.ingestMessage(incoming('m2', T0 + 5), undefined, LIVE);

    expect(chats[0].unreadCount).toBe(2);
  });

  it('does not count history pulled in later, or the studio own messages, as unread', async () => {
    const { service, chats } = setup();

    await service.ingestMessage(incoming('old', T0)); // a sync: no options
    await service.ingestMessage(outgoing('mine', T0 + 1), undefined, LIVE);

    expect(chats[0].unreadCount).toBe(0);
  });

  it('counts a message once even when the webhook repeats it', async () => {
    const { service, chats } = setup();

    await service.ingestMessage(incoming('m1', T0), undefined, LIVE);
    await service.ingestMessage(incoming('m1', T0), undefined, LIVE);

    expect(chats[0].unreadCount).toBe(1);
  });
});

describe('WhatsappInboxService attachments', () => {
  const photo = (id: string, extra: Row = {}) =>
    incoming(id, T0, 'lihat', {
      hasMedia: true,
      media: { mimetype: 'image/jpeg', filename: 'bukti.jpg', url: null },
      ...extra,
    });

  it('remembers what kind of file it is, and its name', async () => {
    const { service, messages } = setup();

    await service.ingestMessage(photo('m1'));

    expect(messages[0]).toMatchObject({
      hasMedia: true,
      mediaMime: 'image/jpeg',
      mediaFilename: 'bukti.jpg',
    });
  });

  it('records no file details for a plain text message', async () => {
    const { service, messages } = setup();

    await service.ingestMessage(incoming('m1', T0, 'halo', { media: { mimetype: 'image/png' } }));

    expect(messages[0]).toMatchObject({ hasMedia: false, mediaMime: null, mediaFilename: null });
  });

  it('copies the file to storage right away when the message arrives live', async () => {
    const { service, media, messages } = setup();

    await service.ingestMessage(photo('m1'), undefined, { live: true });

    expect(media.prefetch).toHaveBeenCalledWith(messages[0].id);
  });

  it('leaves history alone until someone opens it, instead of downloading everything', async () => {
    const { service, media } = setup();

    await service.ingestMessage(photo('m1'));

    expect(media.prefetch).not.toHaveBeenCalled();
  });

  it('does not copy the same file again for a duplicate', async () => {
    const { service, media } = setup();

    await service.ingestMessage(photo('m1'), undefined, { live: true });
    await service.ingestMessage(photo('m1'), undefined, { live: true });

    expect(media.prefetch).toHaveBeenCalledTimes(1);
  });
});

describe('WhatsappInboxService names', () => {
  it('strips invisible direction marks from a WhatsApp name', async () => {
    const { service, chats } = setup();

    await service.ingestMessage(
      incoming('m1', T0, 'a', {
        _data: { Info: { PushName: '\u200EMuhammad Ilham\u200F Maulana' } },
      }),
    );

    expect(chats[0].name).toBe('Muhammad Ilham Maulana');
  });

  it('cleans the name given by a sync as well, and drops one that is only invisible', async () => {
    const a = setup();
    await a.service.ingestMessage(incoming('m1', T0), '\u200B\uFEFFAnisa ');
    expect(a.chats[0].name).toBe('Anisa');

    const b = setup();
    await b.service.ingestMessage(incoming('m1', T0), '\u200E\u200F');
    expect(b.chats[0].name).toBeFalsy();
  });
});

describe('WhatsappInboxService attachments seen again', () => {
  it('fills in the file type of a message that was stored before attachments were tracked', async () => {
    const { service, messages } = setup();
    await service.ingestMessage(incoming('m1', T0, 'lihat', { hasMedia: true }));
    expect(messages[0].mediaMime).toBeNull();

    const result = await service.ingestMessage(
      incoming('m1', T0, 'lihat', {
        hasMedia: true,
        media: { mimetype: 'image/png', filename: 'a.png' },
      }),
    );

    expect(result).toBe('duplicate');
    expect(messages[0]).toMatchObject({ mediaMime: 'image/png', mediaFilename: 'a.png' });
  });

  it('never overwrites a type that is already known', async () => {
    const { service, messages } = setup();
    await service.ingestMessage(
      incoming('m1', T0, 'x', { hasMedia: true, media: { mimetype: 'image/jpeg' } }),
    );

    await service.ingestMessage(
      incoming('m1', T0, 'x', { hasMedia: true, media: { mimetype: 'image/png' } }),
    );

    expect(messages[0].mediaMime).toBe('image/jpeg');
  });
});
