const sendMail = jest.fn();
const close = jest.fn();
jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn(() => ({ sendMail, close })) },
}));

import nodemailer from 'nodemailer';
import { EmailService, singleLine, useImplicitTls } from './email.service';

const SMTP_ENV = {
  SMTP_HOST: 'smtp.example.test',
  SMTP_PORT: '587',
  SMTP_FROM_EMAIL: 'studio@example.test',
  SMTP_FROM_NAME: 'Kayastory',
};

function setup(env: Record<string, string | undefined> = {}) {
  for (const key of Object.keys(process.env).filter((k) => k.startsWith('SMTP_'))) {
    delete process.env[key];
  }
  Object.assign(process.env, SMTP_ENV, env);
  for (const [key, value] of Object.entries(env)) if (value === undefined) delete process.env[key];
  return new EmailService();
}

describe('EmailService', () => {
  afterAll(() => {
    for (const key of Object.keys(SMTP_ENV)) delete process.env[key];
  });

  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue({});
    close.mockReset();
    (nodemailer.createTransport as jest.Mock).mockClear();
  });

  it('uses implicit TLS only for port 465 or when asked', () => {
    expect(useImplicitTls(465, false)).toBe(true);
    expect(useImplicitTls(587, false)).toBe(false);
    expect(useImplicitTls(2525, true)).toBe(true);
  });

  it('flattens line breaks so a subject cannot inject headers', () => {
    expect(singleLine('Halo\r\nBcc: attacker@example.test')).toBe(
      'Halo Bcc: attacker@example.test',
    );
  });

  it('sends with a stable message id and closes the connection', async () => {
    await setup().deliver({
      to: 'customer@example.test',
      subject: 'Invoice\nBcc: x@example.test',
      text: 'isi',
      html: '<p>isi</p>',
      messageKey: 'event-1:email',
    });

    const mail = sendMail.mock.calls[0][0];
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.from).toBe('"Kayastory" <studio@example.test>');
    expect(mail.html).toBe('<p>isi</p>');
    expect(mail.messageId).toMatch(/^<[0-9a-f]{64}@example\.test>$/);
    expect(close).toHaveBeenCalled();

    await setup().deliver({ to: 'a@b.test', subject: 's', text: 't', messageKey: 'event-1:email' });
    expect(sendMail.mock.calls[1][0].messageId).toBe(mail.messageId);
  });

  it('passes attachments, including an inline image, on to the mail', async () => {
    const attachments = [
      {
        filename: 'logo.png',
        content: Buffer.from('png'),
        cid: 'studio-logo',
        contentType: 'image/png',
      },
      { filename: 'INV-1.pdf', content: Buffer.from('%PDF-'), contentType: 'application/pdf' },
    ];

    await setup().deliver({
      to: 'a@b.test',
      subject: 's',
      text: 't',
      attachments,
      messageKey: 'k',
    });

    expect(sendMail.mock.calls[0][0].attachments).toEqual(attachments);
  });

  it('opens an implicit-TLS connection on port 465', async () => {
    await setup({ SMTP_PORT: '465' }).deliver({
      to: 'a@b.test',
      subject: 's',
      text: 't',
      messageKey: 'k',
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 465, secure: true }),
    );
  });

  it('authenticates only when a username is configured', async () => {
    await setup({ SMTP_USER: 'apikey', SMTP_PASSWORD: 'rahasia' }).deliver({
      to: 'a@b.test',
      subject: 's',
      text: 't',
      messageKey: 'k',
    });
    expect(nodemailer.createTransport).toHaveBeenLastCalledWith(
      expect.objectContaining({ auth: { user: 'apikey', pass: 'rahasia' } }),
    );

    await setup().deliver({ to: 'a@b.test', subject: 's', text: 't', messageKey: 'k' });
    expect(nodemailer.createTransport).toHaveBeenLastCalledWith(
      expect.objectContaining({ auth: undefined }),
    );
  });

  it('refuses to send, naming the missing variables, when the environment is incomplete', async () => {
    await expect(
      setup({ SMTP_HOST: undefined }).deliver({
        to: 'a@b.test',
        subject: 's',
        text: 't',
        messageKey: 'k',
      }),
    ).rejects.toThrow('SMTP belum dikonfigurasi di environment: SMTP_HOST');
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('tells the admin the real reason a test send failed', async () => {
    sendMail.mockRejectedValue(new Error('Invalid login: 535 Authentication failed'));

    await expect(setup().sendTest('admin@example.test')).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining('Invalid login: 535 Authentication failed'),
    });
  });
});
