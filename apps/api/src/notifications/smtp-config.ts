/**
 * SMTP credentials come from the environment (deploy-time, never editable from the admin panel),
 * so a leaked admin session cannot redirect mail or read the password.
 */
export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  fromEmail: string;
  fromName?: string;
};

/** `config` is set when configured; `missing` lists what to add to the environment when not. */
export type SmtpStatus = { configured: boolean; config?: SmtpConfig; missing?: string[] };

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/** Port 465 is implicit TLS; every other port negotiates TLS via STARTTLS. */
export function useImplicitTls(port: number, secure: boolean) {
  return secure || port === 465;
}

export function readSmtpConfig(env: NodeJS.ProcessEnv = process.env): SmtpStatus {
  const text = (key: string) => env[key]?.trim() || undefined;
  const missing: string[] = [];

  const host = text('SMTP_HOST');
  if (!host) missing.push('SMTP_HOST');

  const fromEmail = text('SMTP_FROM_EMAIL');
  if (!fromEmail) missing.push('SMTP_FROM_EMAIL');
  else if (!EMAIL.test(fromEmail)) missing.push('SMTP_FROM_EMAIL (format tidak valid)');

  const rawPort = text('SMTP_PORT');
  const port = rawPort === undefined ? 587 : Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) missing.push('SMTP_PORT (tidak valid)');

  const username = text('SMTP_USER');
  const password = env.SMTP_PASSWORD || undefined;
  if (username && !password) missing.push('SMTP_PASSWORD (wajib bila SMTP_USER diisi)');

  if (missing.length) return { configured: false, missing };
  return {
    configured: true,
    config: {
      host: host!,
      port,
      secure: useImplicitTls(port, text('SMTP_SECURE') === 'true'),
      username,
      password,
      fromEmail: fromEmail!,
      fromName: text('SMTP_FROM_NAME'),
    },
  };
}
