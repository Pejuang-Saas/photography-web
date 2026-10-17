import { BadGatewayException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import nodemailer, { Transporter } from 'nodemailer';
import { singleLine } from '../common/single-line';
import { readSmtpConfig, type SmtpConfig } from './smtp-config';

export { singleLine };
export { useImplicitTls } from './smtp-config';

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
    /** Makes it an inline image that the HTML can show with `cid:`. */
    cid?: string;
  }>;
  /** Stable per message; becomes the Message-ID so a resend is recognisable as the same email. */
  messageKey: string;
};

@Injectable()
export class EmailService {
  /** Sends one message through the SMTP server named in the environment. Throws on any problem. */
  async deliver(mail: OutgoingEmail) {
    const status = readSmtpConfig();
    if (!status.configured) {
      throw new Error(`SMTP belum dikonfigurasi di environment: ${status.missing.join(', ')}`);
    }
    const setting = status.config;

    const transporter = this.createTransport(setting);
    const domain = setting.fromEmail.split('@')[1] ?? 'localhost';
    try {
      await transporter.sendMail({
        from: setting.fromName
          ? `"${singleLine(setting.fromName).replace(/"/g, "'")}" <${setting.fromEmail}>`
          : setting.fromEmail,
        to: mail.to,
        subject: singleLine(mail.subject),
        text: mail.text,
        html: mail.html,
        attachments: mail.attachments,
        messageId: `<${createHash('sha256').update(mail.messageKey).digest('hex')}@${domain}>`,
        headers: { 'X-Photography-Event-Key': singleLine(mail.messageKey) },
      });
    } finally {
      transporter.close();
    }
  }

  /**
   * Test send straight through SMTP (not the queue) so the admin sees the real outcome at once.
   * Provider errors such as a wrong password or an unreachable host are passed on in plain text.
   */
  async sendTest(to: string) {
    try {
      await this.deliver({
        to,
        subject: 'Tes email SMTP',
        text: 'SMTP berhasil dikonfigurasi dan email tes ini berhasil dikirim dari backend.',
        messageKey: `smtp-test:${Date.now()}`,
      });
    } catch (error) {
      throw new BadGatewayException(
        `Email tes gagal dikirim: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return { sent: true, to };
  }

  private createTransport(setting: SmtpConfig): Transporter {
    return nodemailer.createTransport({
      host: setting.host,
      port: setting.port,
      secure: setting.secure,
      auth: setting.username ? { user: setting.username, pass: setting.password ?? '' } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
}
