import { createHmac, timingSafeEqual } from 'crypto';

/**
 * WAHA signs each webhook with HMAC-SHA512 of the raw request body and sends it hex encoded in
 * `X-Webhook-Hmac`. Without a configured secret nothing is accepted, so the endpoint can never be
 * left open by forgetting to set it.
 */
export function verifyWahaSignature(
  rawBody: Buffer | undefined,
  signature: string | undefined,
  secret: string | undefined,
  algorithm: string | undefined = 'sha512',
) {
  if (!rawBody || !signature || !secret) return false;
  if (algorithm.toLowerCase() !== 'sha512') return false;

  const expected = createHmac('sha512', secret).update(rawBody).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature.trim(), 'hex');
  } catch {
    return false;
  }
  return received.length === expected.length && timingSafeEqual(received, expected);
}
