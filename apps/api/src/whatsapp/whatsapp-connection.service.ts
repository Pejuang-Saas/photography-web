import { BadGatewayException, ConflictException, Injectable } from '@nestjs/common';
import { WahaClient, WahaError, type WahaSession } from '../waha/waha.client';

export type ConnectionState =
  | 'NOT_CONFIGURED'
  | 'UNREACHABLE'
  | 'DISCONNECTED'
  | 'STARTING'
  | 'SCAN_QR'
  | 'CONNECTED'
  | 'FAILED';

export type ConnectionStatus = {
  state: ConnectionState;
  session: string;
  /** Automatic notifications over WhatsApp (WAHA_ENABLED). Connecting works without it. */
  automationEnabled: boolean;
  account: { phone: string | null; name: string | null } | null;
  engine: string | null;
  /** Why the state is NOT_CONFIGURED or UNREACHABLE. */
  detail?: string;
};

const STATE_BY_WAHA = {
  STOPPED: 'DISCONNECTED',
  STARTING: 'STARTING',
  SCAN_QR_CODE: 'SCAN_QR',
  WORKING: 'CONNECTED',
  FAILED: 'FAILED',
} as const;

/** "6281234567890:12@c.us" -> "6281234567890" (WAHA appends the device number). */
export function phoneFromWahaId(id?: string) {
  const digits = id?.split('@')[0]?.split(':')[0]?.replace(/\D/g, '');
  return digits || null;
}

@Injectable()
export class WhatsappConnectionService {
  constructor(private readonly waha: WahaClient) {}

  async status(): Promise<ConnectionStatus> {
    const base = {
      session: this.waha.sessionName(),
      automationEnabled: this.waha.isEnabled(),
      account: null,
      engine: null,
    };
    if (!this.waha.isConfigured()) {
      return {
        ...base,
        state: 'NOT_CONFIGURED',
        detail: 'WAHA_BASE_URL dan WAHA_API_KEY belum diisi di environment server',
      };
    }

    let session: WahaSession | null;
    try {
      session = await this.waha.getSession();
    } catch (error) {
      return { ...base, state: 'UNREACHABLE', detail: this.message(error) };
    }
    if (!session) return { ...base, state: 'DISCONNECTED' };

    const state = STATE_BY_WAHA[session.status] ?? 'FAILED';
    return {
      ...base,
      state,
      engine: session.engine?.engine ?? null,
      account:
        state === 'CONNECTED'
          ? { phone: phoneFromWahaId(session.me?.id), name: session.me?.pushName ?? null }
          : null,
    };
  }

  /** Starts the session so that a QR code appears. Safe to call again while it is already running. */
  async connect() {
    const current = await this.guard(() => this.waha.getSession());
    if (!current) await this.guard(() => this.waha.createSession());
    else if (current.status === 'STOPPED' || current.status === 'FAILED') {
      // A session created before webhooks were set up (or by someone else) learns about them here.
      await this.guard(() => this.waha.updateSessionConfig());
      await this.guard(() => this.waha.startSession());
    }
    return this.status();
  }

  /** The QR code to scan, as a data URL the browser can show directly. */
  async qr() {
    const session = await this.guard(() => this.waha.getSession());
    if (session?.status !== 'SCAN_QR_CODE') {
      throw new ConflictException('Sesi WhatsApp sedang tidak menunggu pemindaian QR');
    }
    const qr = await this.guard(() => this.waha.getQr());
    return { image: `data:${qr.mimetype};base64,${qr.data}` };
  }

  /** Unlinks the WhatsApp account and stops the session. Only this application's session is touched. */
  async disconnect() {
    const session = await this.guard(() => this.waha.getSession());
    if (session) {
      // Logging out is only possible once linked; a session still waiting for a scan just stops.
      if (session.status === 'WORKING') await this.guard(() => this.waha.logoutSession());
      await this.guard(() => this.waha.stopSession());
    }
    return this.status();
  }

  private async guard<T>(action: () => Promise<T>) {
    try {
      return await action();
    } catch (error) {
      throw new BadGatewayException(this.message(error));
    }
  }

  private message(error: unknown) {
    return error instanceof WahaError || error instanceof Error ? error.message : String(error);
  }
}
