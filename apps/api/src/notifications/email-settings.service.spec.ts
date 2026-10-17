import { EmailSettingsService } from './email-settings.service';

function setup() {
  const row = {
    id: 'default',
    enabled: true,
    autoSendInvoice: true,
    updatedAt: new Date(),
  };
  const emailSetting = {
    upsert: jest.fn().mockResolvedValue(row),
    update: jest.fn().mockResolvedValue(row),
  };
  return { service: new EmailSettingsService({ emailSetting } as never), emailSetting };
}

describe('EmailSettingsService', () => {
  afterEach(() => {
    for (const key of Object.keys(process.env).filter((k) => k.startsWith('SMTP_'))) {
      delete process.env[key];
    }
  });

  it('stores only the switches, never anything SMTP related', async () => {
    const { service, emailSetting } = setup();

    await service.update({
      enabled: false,
      autoSendInvoice: false,
      host: 'evil.example.test',
      password: 'x',
    } as never);

    expect(emailSetting.update.mock.calls[0][0].data).toEqual({
      enabled: false,
      autoSendInvoice: false,
    });
  });

  it('shows the environment SMTP server without ever exposing the password', async () => {
    process.env.SMTP_HOST = 'smtp.example.test';
    process.env.SMTP_FROM_EMAIL = 'studio@example.test';
    process.env.SMTP_USER = 'apikey';
    process.env.SMTP_PASSWORD = 'rahasia-banget';
    const { service } = setup();

    const admin = await service.getAdmin();

    expect(admin.smtp).toEqual({
      configured: true,
      host: 'smtp.example.test',
      port: 587,
      fromEmail: 'studio@example.test',
      fromName: null,
      authenticated: true,
    });
    expect(JSON.stringify(admin)).not.toContain('rahasia-banget');
    expect(JSON.stringify(admin)).not.toContain('apikey');
  });

  it('lists what is missing so the admin knows what to ask the developer for', async () => {
    const { service } = setup();

    expect((await service.getAdmin()).smtp).toEqual({
      configured: false,
      missing: ['SMTP_HOST', 'SMTP_FROM_EMAIL'],
    });
  });
});
