import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WahaMessage } from '../crm/waha-ids';

export type { WahaMessage };

/** WAHA's own session states. */
export type WahaSessionStatus = 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED';

/** A conversation as listed by WAHA's chats overview. */
export type WahaChatOverview = {
  id: string;
  name?: string | null;
  lastMessage?: unknown;
};

export type WahaSession = {
  name: string;
  status: WahaSessionStatus;
  /** The linked WhatsApp account, once the QR code has been scanned. */
  me?: { id?: string; pushName?: string } | null;
  engine?: { engine?: string } | null;
};

/** A WAHA call that came back with an error status (or could not be made at all when `status` is 0). */
export class WahaError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'WahaError';
  }
}

@Injectable()
export class WahaClient {
  constructor(private readonly config: ConfigService) {}

  /** Enough to talk to WAHA (connection management). Independent of the notification switch. */
  isConfigured() {
    return (
      Boolean(this.config.get<string>('WAHA_BASE_URL')) &&
      Boolean(this.config.get<string>('WAHA_API_KEY'))
    );
  }

  /** Whether automatic notifications may go out over WhatsApp (WAHA_ENABLED=true). */
  isEnabled() {
    return this.config.get<string>('WAHA_ENABLED') === 'true' && this.isConfigured();
  }

  /** The one session this application manages; other sessions on a shared WAHA are never touched. */
  sessionName() {
    return this.config.get<string>('WAHA_SESSION') || 'default';
  }

  /** Null when the session does not exist yet. */
  async getSession(): Promise<WahaSession | null> {
    try {
      return await this.call<WahaSession>('GET', `/api/sessions/${this.session()}`);
    } catch (error) {
      if (error instanceof WahaError && error.status === 404) return null;
      throw error;
    }
  }

  /** Creates the session and starts it, which makes WAHA produce a QR code to scan. */
  createSession() {
    const config = this.webhookConfig();
    return this.call<WahaSession>('POST', '/api/sessions', {
      name: this.sessionName(),
      start: true,
      ...(config ? { config } : {}),
    });
  }

  /**
   * Where WAHA should deliver events for this session. Null when not configured, in which case the
   * session still works for sending but the CRM receives no incoming messages.
   */
  webhookConfig() {
    const url = this.config.get<string>('WAHA_WEBHOOK_URL');
    const key = this.config.get<string>('WAHA_WEBHOOK_SECRET');
    if (!url || !key) return null;
    return {
      webhooks: [
        {
          url,
          // message.any covers incoming and outgoing messages; message already fires for incoming
          // ones too, so subscribing to both would only deliver every message twice.
          events: ['message.any', 'message.ack', 'session.status'],
          hmac: { key },
          retries: { policy: 'exponential', delaySeconds: 2, attempts: 8 },
        },
      ],
    };
  }

  /** Re-applies the webhook settings to an existing, not running session. */
  async updateSessionConfig() {
    const config = this.webhookConfig();
    if (!config) return null;
    return this.call<WahaSession>('PUT', `/api/sessions/${this.session()}`, {
      name: this.sessionName(),
      config,
    });
  }

  startSession() {
    return this.call<WahaSession>('POST', `/api/sessions/${this.session()}/start`);
  }

  stopSession() {
    return this.call<WahaSession>('POST', `/api/sessions/${this.session()}/stop`);
  }

  logoutSession() {
    return this.call<WahaSession>('POST', `/api/sessions/${this.session()}/logout`);
  }

  /** The current pairing QR code as a PNG, base64 encoded. */
  getQr() {
    return this.call<{ mimetype: string; data: string }>('GET', `/api/${this.session()}/auth/qr`);
  }

  /** The most recently active conversations. */
  listChats(limit: number, offset = 0) {
    return this.call<WahaChatOverview[]>(
      'GET',
      `/api/${this.session()}/chats/overview?limit=${limit}&offset=${offset}`,
    );
  }

  /** Newest messages of one conversation. Media is not downloaded, only noted. */
  listMessages(chatId: string, limit: number, offset = 0) {
    return this.call<WahaMessage[]>(
      'GET',
      `/api/${this.session()}/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}&offset=${offset}&downloadMedia=false`,
    );
  }

  /**
   * The file attached to a message. WAHA first prepares it and reports a URL on its own address,
   * which is not necessarily one we can reach, so only the path is kept and fetched from the
   * configured WAHA address. Refuses anything over `maxBytes` rather than loading it all.
   */
  async downloadMessageMedia(chatId: string, messageId: string, maxBytes: number) {
    const message = await this.call<WahaMessage>(
      'GET',
      `/api/${this.session()}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}?downloadMedia=true`,
    );
    const media = message?.media;
    // WAHA reports an error instead of a URL when WhatsApp itself no longer holds the file.
    if (media?.error && !media.url) {
      throw new WahaError(410, 'File sudah tidak tersedia di WhatsApp (kedaluwarsa)');
    }
    if (!media?.url) throw new WahaError(404, 'WAHA tidak menyediakan file untuk pesan ini');

    const path = new URL(media.url).pathname;
    const baseUrl = this.config.getOrThrow<string>('WAHA_BASE_URL').replace(/\/$/, '');
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        headers: { 'X-Api-Key': this.config.getOrThrow<string>('WAHA_API_KEY') },
        signal: AbortSignal.timeout(60_000),
      });
    } catch (error) {
      throw new WahaError(
        0,
        `WAHA tidak dapat dijangkau: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!response.ok) {
      throw new WahaError(response.status, `Mengunduh file dari WAHA gagal (${response.status})`);
    }
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new WahaError(413, 'File terlalu besar');
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) throw new WahaError(413, 'File terlalu besar');

    return {
      buffer,
      mimetype: media.mimetype ?? response.headers.get('content-type') ?? undefined,
      filename: media.filename ?? undefined,
    };
  }

  /** The phone number behind a LID, or null when WhatsApp has not revealed it. */
  async lidToPhone(lid: string) {
    const result = await this.call<{ pn?: string | null }>(
      'GET',
      `/api/${this.session()}/lids/${encodeURIComponent(lid)}`,
    );
    return result?.pn ?? null;
  }

  /**
   * An admin typing in the CRM. Unlike sendText this ignores WAHA_ENABLED (that switch only
   * gates automatic notifications) but still needs a connected session. WAHA answers with the
   * message it created, whose id lets us store it without waiting for the webhook.
   */
  sendTextToChat(chatId: string, text: string) {
    return this.call<{ id?: string }>('POST', '/api/sendText', {
      session: this.sessionName(),
      chatId,
      text,
    });
  }

  /** The "typing…" indicator the other person sees; purely cosmetic, so callers may ignore failure. */
  startTyping(chatId: string) {
    return this.call('POST', '/api/startTyping', { session: this.sessionName(), chatId });
  }

  stopTyping(chatId: string) {
    return this.call('POST', '/api/stopTyping', { session: this.sessionName(), chatId });
  }

  async sendText(phoneOrChatId: string, text: string) {
    if (!this.isEnabled()) throw new Error('WAHA delivery is disabled or not configured');

    await this.call('POST', '/api/sendText', {
      session: this.sessionName(),
      chatId: this.chatId(phoneOrChatId),
      text,
    });
  }

  private session() {
    return encodeURIComponent(this.sessionName());
  }

  private async call<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
    if (!this.isConfigured()) throw new WahaError(0, 'WAHA belum dikonfigurasi di environment');

    const baseUrl = this.config.getOrThrow<string>('WAHA_BASE_URL').replace(/\/$/, '');
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          accept: 'application/json',
          'X-Api-Key': this.config.getOrThrow<string>('WAHA_API_KEY'),
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new WahaError(
        0,
        `WAHA tidak dapat dijangkau: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new WahaError(
        response.status,
        `WAHA ${method} ${path} gagal (${response.status}): ${text.slice(0, 300)}`,
      );
    }
    return (await response.json().catch(() => undefined)) as T;
  }

  private chatId(value: string) {
    if (value.includes('@')) return value;
    const digits = value.replace(/\D/g, '');
    if (digits.length < 8)
      throw new Error('Customer phone number is invalid for WhatsApp delivery');
    return `${digits}@c.us`;
  }
}
