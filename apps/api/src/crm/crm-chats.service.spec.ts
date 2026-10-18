import { Prisma } from '@prisma/client';
import { CrmChatsService } from './crm-chats.service';

const NOW = new Date();
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

const chat = (overrides: Record<string, unknown> = {}) => ({
  id: 'chat-1',
  chatId: '6281234567890@c.us',
  phone: '6281234567890',
  name: 'Anisa WA',
  lastMessageAt: minutesAgo(5),
  lastInboundAt: minutesAgo(5),
  lastMessagePreview: 'halo',
  lastMessageFromMe: false,
  unreadCount: 0,
  category: null,
  ...overrides,
});

const booking = (overrides: Record<string, unknown> = {}) => ({
  id: 'b1',
  bookingCode: 'KYA-2026-111111',
  customerName: 'Anisa Rahmawati',
  customerPhone: '081234567890',
  packageName: 'Solo Kebaya',
  sessionDate: new Date('2026-11-05'),
  timeSlot: '09:30 - 10:30',
  status: 'CONFIRMED',
  paymentStatus: 'PAID_DP',
  ...overrides,
});

function setup(options: { chats?: any[]; total?: number; bookings?: any[]; named?: any[] } = {}) {
  const prisma = {
    whatsappChat: {
      findMany: jest.fn().mockResolvedValue(options.chats ?? [chat()]),
      count: jest.fn().mockResolvedValue(options.total ?? (options.chats ?? [chat()]).length),
      findUnique: jest.fn().mockResolvedValue(chat()),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      aggregate: jest.fn().mockResolvedValue({ _sum: { unreadCount: 0 } }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    whatsappMessage: { findMany: jest.fn().mockResolvedValue([]) },
    booking: {
      findMany: jest.fn(async (args: any) =>
        args.where.customerName ? (options.named ?? []) : (options.bookings ?? []),
      ),
    },
  };
  return { prisma, service: new CrmChatsService(prisma as never) };
}

describe('CrmChatsService.list', () => {
  it('shows newest conversations first, those without messages last', async () => {
    const { service, prisma } = setup();

    await service.list({});

    expect(prisma.whatsappChat.findMany.mock.calls[0][0].orderBy).toEqual([
      { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      { createdAt: 'desc' },
    ]);
  });

  it('matches a booking whichever way the number was written, and names the customer from it', async () => {
    const { service, prisma } = setup({ bookings: [booking()] });

    const { items } = await service.list({});

    expect(prisma.booking.findMany.mock.calls[0][0].where.customerPhone.in).toEqual([
      '6281234567890',
      '081234567890',
    ]);
    expect(items[0].booking).toMatchObject({
      bookingCode: 'KYA-2026-111111',
      paymentStatus: 'PAID_DP',
    });
    expect(items[0].displayName).toBe('Anisa Rahmawati');
  });

  it('uses the newest booking when a customer has several', async () => {
    const { service } = setup({
      bookings: [
        booking({ id: 'new', bookingCode: 'NEW' }),
        booking({ id: 'old', bookingCode: 'OLD', customerPhone: '6281234567890' }),
      ],
    });

    expect((await service.list({})).items[0].booking?.bookingCode).toBe('NEW');
  });

  it('names the customer from a live booking, but prefers the WhatsApp name over a lapsed one', async () => {
    const live = setup({
      bookings: [booking({ status: 'CONFIRMED', customerName: 'Anisa Rahmawati' })],
    });
    const lapsed = setup({ bookings: [booking({ status: 'EXPIRED', customerName: 'test' })] });

    expect((await live.service.list({})).items[0].displayName).toBe('Anisa Rahmawati');
    expect((await lapsed.service.list({})).items[0].displayName).toBe('Anisa WA');
  });

  it('falls back to the lapsed booking name only when there is no WhatsApp name', async () => {
    const { service } = setup({
      chats: [chat({ name: null })],
      bookings: [booking({ status: 'EXPIRED', customerName: 'Nama Lama' })],
    });

    expect((await service.list({})).items[0].displayName).toBe('Nama Lama');
  });

  it('shows a live booking rather than a newer one that has expired', async () => {
    const { service } = setup({
      bookings: [
        booking({ id: 'expired', bookingCode: 'EXPIRED-NEW', status: 'EXPIRED' }),
        booking({ id: 'live', bookingCode: 'LIVE', status: 'CONFIRMED' }),
      ],
    });

    expect((await service.list({})).items[0].booking?.bookingCode).toBe('LIVE');
  });

  it('falls back to the WhatsApp name, then the number, when there is no booking', async () => {
    const { service } = setup({
      chats: [
        chat(),
        chat({ id: 'c2', chatId: '6289@c.us', phone: '6289876543210', name: null }),
        chat({ id: 'c3', chatId: '123@lid', phone: null, name: null }),
      ],
    });

    const names = (await service.list({})).items.map((item) => item.displayName);

    expect(names).toEqual(['Anisa WA', '6289876543210', '123']);
  });

  it('does not query bookings for conversations with no known number', async () => {
    const { service, prisma } = setup({ chats: [chat({ phone: null })] });

    await service.list({});

    expect(prisma.booking.findMany).not.toHaveBeenCalled();
  });

  it('reports the 24-hour window from the last message the customer sent', async () => {
    const { service } = setup({
      chats: [
        chat({ lastInboundAt: minutesAgo(60) }),
        chat({ id: 'c2', lastInboundAt: minutesAgo(60 * 30) }),
        chat({ id: 'c3', lastInboundAt: null }),
      ],
    });

    const windows = (await service.list({})).items.map((item) => item.window.open);

    expect(windows).toEqual([true, false, false]);
  });

  it('filters by category, and by "none" for uncategorised conversations', async () => {
    const { service, prisma } = setup();

    await service.list({ categoryId: 'cat-1' });
    await service.list({ categoryId: 'none' });

    expect(prisma.whatsappChat.findMany.mock.calls[0][0].where.categoryId).toBe('cat-1');
    expect(prisma.whatsappChat.findMany.mock.calls[1][0].where.categoryId).toBeNull();
  });

  it('searches the WhatsApp name, the number, and the name on the customer’s booking', async () => {
    const { service, prisma } = setup({ named: [{ customerPhone: '081234567890' }] });

    await service.list({ search: ' anisa ' });

    expect(prisma.booking.findMany.mock.calls[0][0].where.customerName).toEqual({
      contains: 'anisa',
      mode: 'insensitive',
    });
    expect(prisma.whatsappChat.findMany.mock.calls[0][0].where.OR).toEqual([
      { name: { contains: 'anisa', mode: 'insensitive' } },
      { phone: { in: ['6281234567890'] } },
    ]);
  });

  it('searches a typed number without its leading zero', async () => {
    const { service, prisma } = setup();

    await service.list({ search: '0812345' });

    expect(prisma.whatsappChat.findMany.mock.calls[0][0].where.OR).toContainEqual({
      phone: { contains: '812345' },
    });
  });

  it('keeps paging within bounds', async () => {
    const { service, prisma } = setup();

    await service.list({ page: -2, pageSize: 99999 });
    await service.list({ page: 3, pageSize: NaN });

    expect(prisma.whatsappChat.findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 100 });
    expect(prisma.whatsappChat.findMany.mock.calls[1][0]).toMatchObject({ skip: 60, take: 30 });
  });
});

describe('CrmChatsService.get', () => {
  it('answers 404 for an unknown conversation', async () => {
    const { service, prisma } = setup();
    prisma.whatsappChat.findUnique.mockResolvedValue(null);

    await expect(service.get('nope')).rejects.toMatchObject({ status: 404 });
  });
});

describe('CrmChatsService.messages', () => {
  const row = (id: string) => ({
    id,
    fromMe: false,
    body: id,
    hasMedia: false,
    ack: 0,
    timestamp: NOW,
    mediaMime: null,
    mediaFilename: null,
  });

  it('returns a page oldest first, and says when there is more', async () => {
    const { service, prisma } = setup();
    prisma.whatsappMessage.findMany.mockResolvedValue([row('c'), row('b'), row('a')]);

    const result = await service.messages('chat-1', { limit: 2 });

    expect(prisma.whatsappMessage.findMany.mock.calls[0][0]).toMatchObject({
      take: 3,
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    });
    expect(result.items.map((m) => m.id)).toEqual(['b', 'c']);
    expect(result.hasMore).toBe(true);
  });

  it('says there is no more on the last page', async () => {
    const { service, prisma } = setup();
    prisma.whatsappMessage.findMany.mockResolvedValue([row('b'), row('a')]);

    expect((await service.messages('chat-1', { limit: 5 })).hasMore).toBe(false);
  });

  it('pages backwards from a timestamp, and ignores one that is not a date', async () => {
    const { service, prisma } = setup();

    await service.messages('chat-1', { before: '2026-10-17T10:00:00.000Z' });
    await service.messages('chat-1', { before: 'garbage' });

    expect(prisma.whatsappMessage.findMany.mock.calls[0][0].where.OR).toEqual([
      { timestamp: { lt: new Date('2026-10-17T10:00:00.000Z') } },
    ]);
    expect(prisma.whatsappMessage.findMany.mock.calls[1][0].where.OR).toBeUndefined();
  });

  it('answers 404 for an unknown conversation', async () => {
    const { service, prisma } = setup();
    prisma.whatsappChat.findUnique.mockResolvedValue(null);

    await expect(service.messages('nope', {})).rejects.toMatchObject({ status: 404 });
  });
});

describe('CrmChatsService.openForBooking', () => {
  function openSetup(options: { booking?: unknown; existing?: { id: string } | null } = {}) {
    const prisma = {
      booking: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            options.booking === undefined
              ? { customerName: 'Anisa', customerPhone: '081234567890' }
              : options.booking,
          ),
      },
      whatsappChat: {
        findFirst: jest.fn().mockResolvedValue(options.existing ?? null),
        create: jest.fn().mockResolvedValue({ id: 'new-chat' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'raced-chat' }),
      },
    };
    return { prisma, service: new CrmChatsService(prisma as never) };
  }

  it('reuses the conversation that already exists for the number', async () => {
    const { service, prisma } = openSetup({ existing: { id: 'chat-9' } });

    expect(await service.openForBooking('b1')).toEqual({ id: 'chat-9' });
    expect(prisma.whatsappChat.findFirst.mock.calls[0][0].where).toEqual({
      phone: '6281234567890',
    });
    expect(prisma.whatsappChat.create).not.toHaveBeenCalled();
  });

  it('creates an empty conversation under the plain number when the customer has not written yet', async () => {
    const { service, prisma } = openSetup();

    expect(await service.openForBooking('b1')).toEqual({ id: 'new-chat' });
    expect(prisma.whatsappChat.create.mock.calls[0][0].data).toEqual({
      chatId: '6281234567890@c.us',
      phone: '6281234567890',
      name: 'Anisa',
    });
  });

  it('survives two clicks at once', async () => {
    const { service, prisma } = openSetup();
    prisma.whatsappChat.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );

    expect(await service.openForBooking('b1')).toEqual({ id: 'raced-chat' });
  });

  it('answers 404 for an unknown booking and 422 for an unusable number', async () => {
    await expect(openSetup({ booking: null }).service.openForBooking('x')).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      openSetup({ booking: { customerName: 'A', customerPhone: '12' } }).service.openForBooking(
        'x',
      ),
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe('CrmChatsService messages: cursor and attachments', () => {
  const T = new Date('2026-10-18T10:00:00.000Z');
  const mrow = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    fromMe: false,
    body: id,
    hasMedia: false,
    ack: 0,
    timestamp: T,
    mediaMime: null,
    mediaFilename: null,
    ...extra,
  });

  it('pages back by time and id, so messages sharing a second with the cursor are not skipped', async () => {
    const { service, prisma } = setup();

    await service.messages('chat-1', { before: T.toISOString(), beforeId: 'id-5' });

    const args = prisma.whatsappMessage.findMany.mock.calls[0][0];
    expect(args.where.OR).toEqual([{ timestamp: { lt: T } }, { timestamp: T, id: { lt: 'id-5' } }]);
    expect(args.orderBy).toEqual([{ timestamp: 'desc' }, { id: 'desc' }]);
  });

  it('falls back to time alone when no id is given', async () => {
    const { service, prisma } = setup();

    await service.messages('chat-1', { before: T.toISOString() });

    expect(prisma.whatsappMessage.findMany.mock.calls[0][0].where.OR).toEqual([
      { timestamp: { lt: T } },
    ]);
  });

  it('describes an attachment, and leaves media empty for plain messages', async () => {
    const { service, prisma } = setup();
    prisma.whatsappMessage.findMany.mockResolvedValue([
      mrow('b', { hasMedia: true, mediaMime: 'image/jpeg', mediaFilename: 'bukti.jpg' }),
      mrow('a'),
    ]);

    const { items } = await service.messages('chat-1', {});

    expect(items.map((item) => item.media)).toEqual([
      null,
      { mime: 'image/jpeg', filename: 'bukti.jpg' },
    ]);
    expect(items[0]).not.toHaveProperty('mediaMime');
  });
});

describe('CrmChatsService unread', () => {
  it('shows how many unread messages each conversation has', async () => {
    const { service } = setup({ chats: [chat({ unreadCount: 3 })] });

    expect((await service.list({})).items[0].unreadCount).toBe(3);
  });

  it('marks a conversation read, and answers 404 for one that does not exist', async () => {
    const { service, prisma } = setup();

    await service.markRead('chat-1');
    expect(prisma.whatsappChat.updateMany).toHaveBeenCalledWith({
      where: { id: 'chat-1' },
      data: { unreadCount: 0 },
    });

    prisma.whatsappChat.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.markRead('nope')).rejects.toMatchObject({ status: 404 });
  });

  it('adds up the unread messages and names who wrote last', async () => {
    const { service, prisma } = setup();
    prisma.whatsappChat.aggregate.mockResolvedValue({ _sum: { unreadCount: 5 } });
    prisma.whatsappChat.findFirst.mockResolvedValue({
      id: 'chat-7',
      name: 'Anisa',
      phone: '6281234567890',
      chatId: '1@lid',
      lastMessagePreview: 'sudah transfer ya',
      lastMessageAt: new Date('2026-10-18T10:00:00.000Z'),
    });

    expect(await service.unreadSummary()).toEqual({
      total: 5,
      latest: {
        chatId: 'chat-7',
        displayName: 'Anisa',
        preview: 'sudah transfer ya',
        at: new Date('2026-10-18T10:00:00.000Z'),
      },
    });
    expect(prisma.whatsappChat.findFirst.mock.calls[0][0].where).toEqual({
      unreadCount: { gt: 0 },
    });
  });

  it('reports zero and nobody when everything has been read', async () => {
    const { service } = setup();

    expect(await service.unreadSummary()).toEqual({ total: 0, latest: null });
  });

  it('falls back to the number, then the id, for a latest sender without a name', async () => {
    const { service, prisma } = setup();
    prisma.whatsappChat.findFirst.mockResolvedValue({
      id: 'c',
      name: null,
      phone: null,
      chatId: '123@lid',
      lastMessagePreview: null,
      lastMessageAt: null,
    });

    expect((await service.unreadSummary()).latest?.displayName).toBe('123');
  });

  it('ignores invisible characters when searching', async () => {
    const { service, prisma } = setup();

    await service.list({ search: '\u200E anisa ' });

    expect(prisma.whatsappChat.findMany.mock.calls[0][0].where.OR[0]).toEqual({
      name: { contains: 'anisa', mode: 'insensitive' },
    });
  });
});
