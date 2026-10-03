import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function encryptionKey() {
  const value = process.env.PAYMENT_CONFIG_ENCRYPTION_KEY || process.env.CONFIG_ENCRYPTION_KEY;
  if (!value)
    throw new Error(
      'PAYMENT_CONFIG_ENCRYPTION_KEY or CONFIG_ENCRYPTION_KEY is required to save or read encrypted secrets',
    );
  return createHash('sha256').update(value).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(value: string) {
  const [ivEncoded, authTagEncoded, encryptedEncoded] = value.split(':');
  if (!ivEncoded || !authTagEncoded || !encryptedEncoded) {
    throw new Error('Encrypted secret has an invalid format');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivEncoded, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(authTagEncoded, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
