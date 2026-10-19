jest.mock('@nestjs-redis/client', () => ({ RedisToken: () => 'REDIS' }));
import { CrmEventsService } from './crm-events.service';

function setup() {
  let listener: (raw: string) => void = () => undefined;
  const subscriber = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(async (_channel: string, fn: (raw: string) => void) => {
      listener = fn;
    }),
    quit: jest.fn().mockResolvedValue(undefined),
  };
  const redis = {
    duplicate: jest.fn().mockReturnValue(subscriber),
    publish: jest.fn().mockResolvedValue(1),
  };
  const service = new CrmEventsService(redis as never);
  return { service, redis, subscriber, deliver: (raw: string) => listener(raw) };
}

describe('CrmEventsService', () => {
  it('publishes the event as JSON on the shared channel', () => {
    const { service, redis } = setup();

    service.publish({ type: 'message', chatId: 'c1' });

    expect(redis.publish).toHaveBeenCalledWith(
      'crm:events',
      JSON.stringify({ type: 'message', chatId: 'c1' }),
    );
  });

  it('does not fail the caller when Redis does', async () => {
    const { service, redis } = setup();
    redis.publish.mockRejectedValue(new Error('down'));

    expect(() => service.publish({ type: 'categories' })).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
  });

  it('hands what arrives from Redis to every listener, and ignores garbage', async () => {
    const { service, deliver } = setup();
    await service.onModuleInit();
    const first: unknown[] = [];
    const second: unknown[] = [];
    service.stream().subscribe((event) => first.push(event));
    service.stream().subscribe((event) => second.push(event));

    deliver('not json');
    deliver(JSON.stringify({ type: 'chat', chatId: 'c9' }));

    expect(first).toEqual([{ type: 'chat', chatId: 'c9' }]);
    expect(second).toEqual(first);
  });

  it('starts anyway when Redis cannot be subscribed to', async () => {
    const { service, subscriber } = setup();
    subscriber.connect.mockRejectedValue(new Error('refused'));

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('closes its connection on shutdown', async () => {
    const { service, subscriber } = setup();
    await service.onModuleInit();

    await service.onModuleDestroy();

    expect(subscriber.quit).toHaveBeenCalled();
  });
});
