import { readSmtpConfig, useImplicitTls } from './smtp-config';

const base = { SMTP_HOST: 'smtp.example.test', SMTP_FROM_EMAIL: 'studio@example.test' };

describe('readSmtpConfig', () => {
  it('reads a complete setup and defaults to STARTTLS on 587', () => {
    expect(readSmtpConfig(base)).toEqual({
      configured: true,
      config: {
        host: 'smtp.example.test',
        port: 587,
        secure: false,
        username: undefined,
        password: undefined,
        fromEmail: 'studio@example.test',
        fromName: undefined,
      },
    });
  });

  it('reports every missing variable at once', () => {
    expect(readSmtpConfig({})).toEqual({
      configured: false,
      missing: ['SMTP_HOST', 'SMTP_FROM_EMAIL'],
    });
  });

  it('treats blank values as unset', () => {
    expect(readSmtpConfig({ ...base, SMTP_HOST: '   ' })).toMatchObject({ configured: false });
  });

  it('rejects an invalid port or sender address', () => {
    expect(readSmtpConfig({ ...base, SMTP_PORT: 'abc' })).toMatchObject({
      configured: false,
      missing: ['SMTP_PORT (tidak valid)'],
    });
    expect(readSmtpConfig({ ...base, SMTP_PORT: '70000' })).toMatchObject({ configured: false });
    expect(readSmtpConfig({ ...base, SMTP_FROM_EMAIL: 'bukan-email' })).toMatchObject({
      configured: false,
    });
  });

  it('requires a password whenever a username is given', () => {
    expect(readSmtpConfig({ ...base, SMTP_USER: 'apikey' })).toMatchObject({
      configured: false,
      missing: ['SMTP_PASSWORD (wajib bila SMTP_USER diisi)'],
    });
  });

  it('keeps the password exactly as written, spaces included', () => {
    const status = readSmtpConfig({ ...base, SMTP_USER: 'u', SMTP_PASSWORD: ' pa ss ' });
    expect(status.configured && status.config.password).toBe(' pa ss ');
  });

  it('uses implicit TLS on 465 or when SMTP_SECURE=true', () => {
    expect(readSmtpConfig({ ...base, SMTP_PORT: '465' })).toMatchObject({
      config: { secure: true },
    });
    expect(readSmtpConfig({ ...base, SMTP_PORT: '2525', SMTP_SECURE: 'true' })).toMatchObject({
      config: { secure: true },
    });
    expect(useImplicitTls(587, false)).toBe(false);
  });
});
