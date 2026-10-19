jest.mock('@nestjs-redis/client', () => ({ RedisToken: () => 'REDIS' }));
import { Prisma } from '@prisma/client';
import { CrmCategoriesService } from './crm-categories.service';

function setup(
  options: { clash?: boolean; existing?: boolean; chat?: boolean; max?: number | null } = {},
) {
  const prisma = {
    crmCategory: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'c1', name: 'Lunas', color: 'green', sortOrder: 0, _count: { chats: 4 } },
        ]),
      findFirst: jest.fn().mockResolvedValue(options.clash ? { id: 'other' } : null),
      findUnique: jest.fn().mockResolvedValue(options.existing === false ? null : { id: 'c1' }),
      aggregate: jest
        .fn()
        .mockResolvedValue({ _max: { sortOrder: options.max === undefined ? 2 : options.max } }),
      create: jest.fn(async ({ data }: any) => ({ id: 'new', ...data })),
      update: jest.fn(async ({ data }: any) => ({ id: 'c1', ...data })),
      delete: jest.fn().mockResolvedValue({}),
    },
    whatsappChat: {
      findUnique: jest.fn().mockResolvedValue(options.chat === false ? null : { id: 'chat-1' }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const events = { publish: jest.fn() };
  return { prisma, events, service: new CrmCategoriesService(prisma as never, events as never) };
}

describe('CrmCategoriesService', () => {
  it('lists categories in order with how many conversations each holds', async () => {
    const { service } = setup();

    expect(await service.list()).toEqual([
      { id: 'c1', name: 'Lunas', color: 'green', sortOrder: 0, chatCount: 4 },
    ]);
  });

  it('adds a category at the end, with a trimmed name', async () => {
    const { service, prisma } = setup({ max: 2 });

    await service.create({ name: '  Wisuda Kilat ', color: 'purple' });

    expect(prisma.crmCategory.create.mock.calls[0][0].data).toEqual({
      name: 'Wisuda Kilat',
      color: 'purple',
      sortOrder: 3,
    });
  });

  it('starts at the top when there are no categories yet', async () => {
    const { service, prisma } = setup({ max: null });

    await service.create({ name: 'Pertama', color: 'blue' });

    expect(prisma.crmCategory.create.mock.calls[0][0].data.sortOrder).toBe(0);
  });

  it('refuses a name that is taken, ignoring case, with 409', async () => {
    const { service, prisma } = setup({ clash: true });

    await expect(service.create({ name: 'lunas', color: 'green' })).rejects.toMatchObject({
      status: 409,
    });
    expect(prisma.crmCategory.findFirst.mock.calls[0][0].where.name).toEqual({
      equals: 'lunas',
      mode: 'insensitive',
    });
    expect(prisma.crmCategory.create).not.toHaveBeenCalled();
  });

  it('settles a race between two identical requests with the database constraint', async () => {
    const { service, prisma } = setup();
    prisma.crmCategory.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );

    await expect(service.create({ name: 'X', color: 'zinc' })).rejects.toMatchObject({
      status: 409,
    });
  });

  it('lets a category keep its own name when only the colour changes', async () => {
    const { service, prisma } = setup();

    await service.update('c1', { color: 'rose' });

    expect(prisma.crmCategory.findFirst).not.toHaveBeenCalled();
    expect(prisma.crmCategory.update.mock.calls[0][0].data).toEqual({
      name: undefined,
      color: 'rose',
    });
  });

  it('excludes the category itself when checking a rename', async () => {
    const { service, prisma } = setup();

    await service.update('c1', { name: 'Baru' });

    expect(prisma.crmCategory.findFirst.mock.calls[0][0].where.id).toEqual({ not: 'c1' });
  });

  it('refuses a blank name on update', async () => {
    const { service } = setup();

    await expect(service.update('c1', { name: '   ' })).rejects.toMatchObject({ status: 409 });
  });

  it('answers 404 for a category that does not exist', async () => {
    const { service } = setup({ existing: false });

    await expect(service.update('x', { color: 'blue' })).rejects.toMatchObject({ status: 404 });
    await expect(service.remove('x')).rejects.toMatchObject({ status: 404 });
  });

  it('deletes a category', async () => {
    const { service, prisma } = setup();

    await service.remove('c1');

    expect(prisma.crmCategory.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('puts a conversation in a category, or takes it out with null', async () => {
    const { service, prisma } = setup();

    await service.assign('chat-1', 'c1');
    await service.assign('chat-1', null);

    expect(prisma.whatsappChat.update.mock.calls[0][0]).toEqual({
      where: { id: 'chat-1' },
      data: { categoryId: 'c1' },
    });
    expect(prisma.whatsappChat.update.mock.calls[1][0].data).toEqual({ categoryId: null });
  });

  it('does not look up a category when removing one from a conversation', async () => {
    const { service, prisma } = setup();

    await service.assign('chat-1', null);

    expect(prisma.crmCategory.findUnique).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown conversation or category when assigning', async () => {
    await expect(setup({ chat: false }).service.assign('x', 'c1')).rejects.toMatchObject({
      status: 404,
    });
    await expect(setup({ existing: false }).service.assign('chat-1', 'x')).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('CrmCategoriesService events', () => {
  it('announces a recategorised conversation', async () => {
    const { service, prisma, events } = setup();
    prisma.whatsappChat.findUnique.mockResolvedValue({ id: 'chat-1' });

    await service.assign('chat-1', null);

    expect(events.publish).toHaveBeenCalledWith({ type: 'chat', chatId: 'chat-1' });
  });
});
