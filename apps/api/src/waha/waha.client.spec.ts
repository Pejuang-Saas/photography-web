import { WahaClient, WahaError } from './waha.client';

function client(env: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    WAHA_BASE_URL: 'http://waha.test:3000/',
    WAHA_API_KEY: 'secret-key',
    ...env,
  };
  const config = {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      if (!values[key]) throw new Error(`missing ${key}`);
      return values[key];
    },
  };
  return new WahaClient(config as never);
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('WahaClient', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as never;
  });

  it('separates "can manage the connection" from "may send notifications"', () => {
    expect(client().isConfigured()).toBe(true);
    expect(client().isEnabled()).toBe(false);
    expect(client({ WAHA_ENABLED: 'true' }).isEnabled()).toBe(true);
    expect(client({ WAHA_API_KEY: '' }).isConfigured()).toBe(false);
    expect(client({ WAHA_ENABLED: 'true', WAHA_API_KEY: '' }).isEnabled()).toBe(false);
  });

  it('defaults to the "default" session and honours WAHA_SESSION', () => {
    expect(client().sessionName()).toBe('default');
    expect(client({ WAHA_SESSION: 'studio' }).sessionName()).toBe('studio');
  });

  it('sends the API key, and no body header on a GET', async () => {
    fetchMock.mockReturnValue(json({ name: 'default', status: 'WORKING' }));

    await client().getSession();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://waha.test:3000/api/sessions/default');
    expect(init.headers['X-Api-Key']).toBe('secret-key');
    expect(init.headers['content-type']).toBeUndefined();
  });

  it('treats a missing session as null instead of an error', async () => {
    fetchMock.mockReturnValue(json({ message: 'not found' }, 404));

    await expect(client().getSession()).resolves.toBeNull();
  });

  it('keeps other failures as errors carrying the status', async () => {
    fetchMock.mockReturnValue(json({ message: 'boom' }, 500));

    await expect(client().getSession()).rejects.toMatchObject({ status: 500 });
  });

  it('reports an unreachable server as status 0 with a readable reason', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const error = await client()
      .getSession()
      .catch((e) => e);

    expect(error).toBeInstanceOf(WahaError);
    expect(error).toMatchObject({ status: 0 });
    expect(error.message).toContain('ECONNREFUSED');
  });

  it('never calls WAHA without configuration', async () => {
    await expect(client({ WAHA_API_KEY: '' }).getSession()).rejects.toMatchObject({ status: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates the session under the configured name and starts it', async () => {
    fetchMock.mockReturnValue(json({}));

    await client({ WAHA_SESSION: 'studio' }).createSession();

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: 'studio', start: true });
  });

  it('refuses to send text unless notifications are enabled', async () => {
    await expect(client().sendText('081234567890', 'hi')).rejects.toThrow('disabled');
  });

  it('turns a phone number into a WhatsApp chat id when sending', async () => {
    fetchMock.mockReturnValue(json({}));

    await client({ WAHA_ENABLED: 'true' }).sendText('+62 812-3456-7890', 'hi');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      session: 'default',
      chatId: '6281234567890@c.us',
      text: 'hi',
    });
  });

  it('rejects a number that is too short to be real', async () => {
    await expect(client({ WAHA_ENABLED: 'true' }).sendText('123', 'hi')).rejects.toThrow('invalid');
  });

  describe('webhooks', () => {
    const env = { WAHA_WEBHOOK_URL: 'http://api:3000/webhooks/waha', WAHA_WEBHOOK_SECRET: 'whsec' };

    it('is not configured without both the address and the secret', () => {
      expect(client().webhookConfig()).toBeNull();
      expect(client({ WAHA_WEBHOOK_URL: env.WAHA_WEBHOOK_URL }).webhookConfig()).toBeNull();
      expect(client({ WAHA_WEBHOOK_SECRET: 'whsec' }).webhookConfig()).toBeNull();
    });

    it('subscribes to message.any rather than message, so each message arrives once', () => {
      const [hook] = client(env).webhookConfig()!.webhooks;

      expect(hook.url).toBe(env.WAHA_WEBHOOK_URL);
      expect(hook.hmac).toEqual({ key: 'whsec' });
      expect(hook.events).toEqual(['message.any', 'message.ack', 'session.status']);
      expect(hook.events).not.toContain('message');
    });

    it('sets the webhook when creating the session, and only then', async () => {
      fetchMock.mockReturnValue(json({}));

      await client(env).createSession();
      await client().createSession();

      expect(JSON.parse(fetchMock.mock.calls[0][1].body).config.webhooks).toHaveLength(1);
      expect(JSON.parse(fetchMock.mock.calls[1][1].body).config).toBeUndefined();
    });

    it('re-applies the webhook to an existing session with PUT, or does nothing without one', async () => {
      fetchMock.mockReturnValue(json({}));

      await client(env).updateSessionConfig();
      expect(fetchMock.mock.calls[0][0]).toBe('http://waha.test:3000/api/sessions/default');
      expect(fetchMock.mock.calls[0][1].method).toBe('PUT');

      fetchMock.mockClear();
      expect(await client().updateSessionConfig()).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('reading conversations', () => {
    it('asks for the chats overview with a limit', async () => {
      fetchMock.mockReturnValue(json([]));

      await client().listChats(25);

      expect(fetchMock.mock.calls[0][0]).toBe(
        'http://waha.test:3000/api/default/chats/overview?limit=25&offset=0',
      );
    });

    it('escapes the chat id and never downloads media', async () => {
      fetchMock.mockReturnValue(json([]));

      await client().listMessages('6281234567890@c.us', 30);

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('/chats/6281234567890%40c.us/messages');
      expect(url).toContain('limit=30');
      expect(url).toContain('downloadMedia=false');
    });

    it('turns a LID into a phone number, or null when WhatsApp has not revealed it', async () => {
      fetchMock.mockReturnValueOnce(json({ lid: '1@lid', pn: '6281234567890@c.us' }));
      expect(await client().lidToPhone('1@lid')).toBe('6281234567890@c.us');
      expect(fetchMock.mock.calls[0][0]).toContain('/lids/1%40lid');

      fetchMock.mockReturnValueOnce(json({ lid: '1@lid', pn: null }));
      expect(await client().lidToPhone('1@lid')).toBeNull();
    });
  });

  describe('sending from the CRM', () => {
    it('sends to a conversation without needing WAHA_ENABLED, and returns the created message', async () => {
      fetchMock.mockReturnValue(json({ id: 'true_1@c.us_X' }));

      const sent = await client().sendTextToChat('6281215941614@c.us', 'Halo');

      expect(sent).toEqual({ id: 'true_1@c.us_X' });
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        session: 'default',
        chatId: '6281215941614@c.us',
        text: 'Halo',
      });
    });

    it('shows and clears the typing indicator for the right conversation', async () => {
      fetchMock.mockReturnValue(json({}));

      await client().startTyping('1@c.us');
      await client().stopTyping('1@c.us');

      expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
        'http://waha.test:3000/api/startTyping',
        'http://waha.test:3000/api/stopTyping',
      ]);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        session: 'default',
        chatId: '1@c.us',
      });
    });
  });

  describe('downloading a message attachment', () => {
    const file = (bytes: number | Buffer, init: ResponseInit = {}) =>
      Promise.resolve(
        new Response(
          (typeof bytes === 'number' ? Buffer.alloc(bytes, 1) : bytes) as unknown as BodyInit,
          {
            status: 200,
            headers: { 'content-type': 'image/jpeg' },
            ...init,
          },
        ),
      );

    const prepared = (url: string | null = 'http://localhost:3000/api/files/default/3A51.jpeg') =>
      json({ id: 'm', hasMedia: true, media: url ? { url, mimetype: 'image/jpeg' } : null });

    it('asks WAHA to prepare the file, then fetches it from our own WAHA address, not the one it reports', async () => {
      fetchMock.mockReturnValueOnce(prepared()).mockReturnValueOnce(file(Buffer.from('JPEGDATA')));

      const result = await client().downloadMessageMedia(
        '186316436332790@lid',
        'false_186316436332790@lid_3A51',
        1000,
      );

      const [prepareUrl] = fetchMock.mock.calls[0];
      expect(prepareUrl).toBe(
        'http://waha.test:3000/api/default/chats/186316436332790%40lid/messages/false_186316436332790%40lid_3A51?downloadMedia=true',
      );
      const [fileUrl, init] = fetchMock.mock.calls[1];
      expect(fileUrl).toBe('http://waha.test:3000/api/files/default/3A51.jpeg');
      expect(init.headers['X-Api-Key']).toBe('secret-key');
      expect(result.buffer.toString()).toBe('JPEGDATA');
      expect(result.mimetype).toBe('image/jpeg');
    });

    it('answers 404 when WAHA has no file for the message', async () => {
      fetchMock.mockReturnValueOnce(prepared(null));

      await expect(client().downloadMessageMedia('c', 'm', 1000)).rejects.toMatchObject({
        status: 404,
      });
    });

    it('reports a file WhatsApp no longer holds as gone (410), not as missing', async () => {
      fetchMock.mockReturnValueOnce(
        json({
          id: 'm',
          hasMedia: true,
          media: {
            url: null,
            mimetype: 'image/webp',
            error: { code: 5, details: 'download failed' },
          },
        }),
      );

      await expect(client().downloadMessageMedia('c', 'm', 1000)).rejects.toMatchObject({
        status: 410,
      });
    });

    it('refuses a file that declares itself too large without reading it', async () => {
      fetchMock
        .mockReturnValueOnce(prepared())
        .mockReturnValueOnce(
          file(10, { headers: { 'content-length': '5000', 'content-type': 'image/jpeg' } }),
        );

      await expect(client().downloadMessageMedia('c', 'm', 1000)).rejects.toMatchObject({
        status: 413,
      });
    });

    it('refuses a file that turns out larger than it said', async () => {
      fetchMock.mockReturnValueOnce(prepared()).mockReturnValueOnce(file(2000));

      await expect(client().downloadMessageMedia('c', 'm', 1000)).rejects.toMatchObject({
        status: 413,
      });
    });

    it('reports a failed file fetch with its status', async () => {
      fetchMock
        .mockReturnValueOnce(prepared())
        .mockReturnValueOnce(Promise.resolve(new Response('', { status: 404 })));

      await expect(client().downloadMessageMedia('c', 'm', 1000)).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
