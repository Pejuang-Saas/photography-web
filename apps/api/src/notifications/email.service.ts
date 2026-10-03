import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import nodemailer, { Transporter } from 'nodemailer';
import { decryptSecret } from '../common/secret-box';
import { EmailSettingsService } from './email-settings.service';

@Injectable()
export class EmailService {
  constructor(private readonly settings: EmailSettingsService) {}

  async send(to: string, subject: string, text: string, eventKey: string) {
    const setting = await this.settings.getCurrent();
    if (!setting.enabled) throw new Error('SMTP delivery is disabled');
    if (!setting.host || !setting.fromEmail) {
      throw new Error('SMTP host and from email are required');
    }

    const transporter = this.createTransport(setting);
    const domain = setting.fromEmail.split('@')[1] ?? 'localhost';
    await transporter.sendMail({
      from: setting.fromName ? `"${setting.fromName}" <${setting.fromEmail}>` : setting.fromEmail,
      to,
      subject,
      text,
      messageId: `<${createHash('sha256').update(eventKey).digest('hex')}@${domain}>`,
      headers: { 'X-Photography-Event-Key': eventKey },
    });
  }

  async sendTest(to: string) {
    await this.send(
      to,
      'SMTP test - Photography',
      'SMTP berhasil dikonfigurasi dan email test ini berhasil dikirim dari backend.',
      `smtp-test:${Date.now()}`,
    );
    return { sent: true, to };
  }

  private createTransport(setting: {
    host: string | null;
    port: number;
    secure: boolean;
    username: string | null;
    passwordEncrypted: string | null;
  }): Transporter {
    const auth = setting.username
      ? {
          user: setting.username,
          pass: setting.passwordEncrypted ? decryptSecret(setting.passwordEncrypted) : '',
        }
      : undefined;

    return nodemailer.createTransport({
      host: setting.host ?? undefined,
      port: setting.port,
      secure: setting.secure,
      auth,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
}
