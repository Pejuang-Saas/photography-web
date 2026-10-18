import { WahaError, type WahaSession } from '../waha/waha.client';
import { phoneFromWahaId, WhatsappConnectionService } from './whatsapp-connection.service';

function setup(options: { configured?: boolean; session?: WahaSession | null } = {}) {
  const waha = {
    isConfigured: jest.fn().mockReturnValue(options.configured ?? true),
    isEnabled: jest.fn().mockReturnValue(false),
    sessionName: jest.fn().mockReturnValue('default'),
    getSession: jest.fn().mockResolvedValue(options.session === undefined ? null : options.session),
    createSession: jest.fn().mockResolvedValue({}),
    startSession: jest.fn().mockResolvedValue({}),
    updateSessionConfig: jest.fn().mockResolvedValue({}),
    stopSession: jest.fn().mockResolvedValue({}),
    logoutSession: jest.fn().mockResolvedValue({}),
    getQr: jest.fn().mockResolvedValue({ mimetype: 'image/png', data: 'QUJD' }),
  };
  return { service: new WhatsappConnectionService(waha as never), waha };
}

const session = (status: WahaSession['status'], extra: Partial<WahaSession> = {}): WahaSession => ({
  name: 'default',
  status,
  ...extra,
});

describe('phoneFromWahaId', () => {
  it('keeps only the number, dropping the device suffix and domain', () => {
    expect(phoneFromWahaId('6281234567890@c.us')).toBe('6281234567890');
    expect(phoneFromWahaId('6281234567890:12@s.whatsapp.net')).toBe('6281234567890');
    expect(phoneFromWahaId(undefined)).toBeNull();
    expect(phoneFromWahaId('')).toBeNull();
  });
});

describe('WhatsappConnectionService.status', () => {
  it('reports a missing configuration without calling WAHA', async () => {
    const { service, waha } = setup({ configured: false });

    const status = await service.status();

    expect(status.state).toBe('NOT_CONFIGURED');
    expect(status.detail).toContain('WAHA_API_KEY');
    expect(waha.getSession).not.toHaveBeenCalled();
  });

  it('reports DISCONNECTED when the session does not exist yet', async () => {
    expect((await setup({ session: null }).service.status()).state).toBe('DISCONNECTED');
  });

  it.each([
    ['STOPPED', 'DISCONNECTED'],
    ['STARTING', 'STARTING'],
    ['SCAN_QR_CODE', 'SCAN_QR'],
    ['WORKING', 'CONNECTED'],
    ['FAILED', 'FAILED'],
  ] as const)('maps WAHA %s to %s', async (wahaStatus, expected) => {
    const { service } = setup({ session: session(wahaStatus) });

    expect((await service.status()).state).toBe(expected);
  });

  it('shows the linked account only while connected', async () => {
    const me = { id: '6281234567890:3@c.us', pushName: 'Kayastory' };

    expect(
      await setup({
        session: session('WORKING', { me, engine: { engine: 'GOWS' } }),
      }).service.status(),
    ).toMatchObject({
      state: 'CONNECTED',
      account: { phone: '6281234567890', name: 'Kayastory' },
      engine: 'GOWS',
    });
    expect(
      (await setup({ session: session('SCAN_QR_CODE', { me }) }).service.status()).account,
    ).toBeNull();
  });

  it('reports UNREACHABLE, not an error, when WAHA cannot be contacted', async () => {
    const { service, waha } = setup();
    waha.getSession.mockRejectedValue(new WahaError(0, 'WAHA tidak dapat dijangkau: ECONNREFUSED'));

    expect(await service.status()).toMatchObject({
      state: 'UNREACHABLE',
      detail: expect.stringContaining('ECONNREFUSED'),
    });
  });
});

describe('WhatsappConnectionService.connect', () => {
  it('creates and starts the session when there is none', async () => {
    const { service, waha } = setup({ session: null });

    await service.connect();

    expect(waha.createSession).toHaveBeenCalled();
    expect(waha.startSession).not.toHaveBeenCalled();
  });

  it.each(['STOPPED', 'FAILED'] as const)('restarts a %s session', async (status) => {
    const { service, waha } = setup({ session: session(status) });

    await service.connect();

    expect(waha.updateSessionConfig).toHaveBeenCalled();
    expect(waha.startSession).toHaveBeenCalled();
    expect(waha.createSession).not.toHaveBeenCalled();
  });

  it.each(['STARTING', 'SCAN_QR_CODE', 'WORKING'] as const)(
    'leaves a %s session alone, so pressing connect twice is harmless',
    async (status) => {
      const { service, waha } = setup({ session: session(status) });

      await service.connect();

      expect(waha.createSession).not.toHaveBeenCalled();
      expect(waha.startSession).not.toHaveBeenCalled();
    },
  );

  it('turns a WAHA failure into a 502 with the reason', async () => {
    const { service, waha } = setup({ session: null });
    waha.createSession.mockRejectedValue(new WahaError(422, 'WAHA POST /api/sessions gagal (422)'));

    await expect(service.connect()).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining('422'),
    });
  });
});

describe('WhatsappConnectionService.qr', () => {
  it('returns the QR code as a data URL while waiting for a scan', async () => {
    const { service } = setup({ session: session('SCAN_QR_CODE') });

    expect(await service.qr()).toEqual({ image: 'data:image/png;base64,QUJD' });
  });

  it.each([null, session('WORKING'), session('STARTING'), session('STOPPED')])(
    'refuses with 409 when no scan is pending (%j)',
    async (current) => {
      const { service, waha } = setup({ session: current });

      await expect(service.qr()).rejects.toMatchObject({ status: 409 });
      expect(waha.getQr).not.toHaveBeenCalled();
    },
  );
});

describe('WhatsappConnectionService.disconnect', () => {
  it('logs a linked account out, then stops the session', async () => {
    const { service, waha } = setup({ session: session('WORKING') });

    await service.disconnect();

    expect(waha.logoutSession).toHaveBeenCalled();
    expect(waha.stopSession).toHaveBeenCalled();
  });

  it('only stops a session that is still waiting for a scan', async () => {
    const { service, waha } = setup({ session: session('SCAN_QR_CODE') });

    await service.disconnect();

    expect(waha.logoutSession).not.toHaveBeenCalled();
    expect(waha.stopSession).toHaveBeenCalled();
  });

  it('does nothing when there is no session', async () => {
    const { service, waha } = setup({ session: null });

    await service.disconnect();

    expect(waha.logoutSession).not.toHaveBeenCalled();
    expect(waha.stopSession).not.toHaveBeenCalled();
  });
});
