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
  });

  it('returns a page oldest first, and says when there is more', async () => {
    const { service, prisma } = setup();
    prisma.whatsappMessage.findMany.mockResolvedValue([row('c'), row('b'), row('a')]);

    const result = await service.messages('chat-1', { limit: 2 });

    expect(prisma.whatsappMessage.findMany.mock.calls[0][0]).toMatchObject({
      take: 3,
      orderBy: { timestamp: 'desc' },
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

    expect(prisma.whatsappMessage.findMany.mock.calls[0][0].where.timestamp).toEqual({
      lt: new Date('2026-10-17T10:00:00.000Z'),
    });
    expect(prisma.whatsappMessage.findMany.mock.calls[1][0].where.timestamp).toBeUndefined();
  });

  it('answers 404 for an unknown conversation', async () => {
    const { service, prisma } = setup();
    prisma.whatsappChat.findUnique.mockResolvedValue(null);

    await expect(service.messages('nope', {})).rejects.toMatchObject({ status: 404 });
  });
});
