import { createHmac } from 'crypto';
import { verifyWahaSignature } from './waha-signature';

const secret = 'shared-secret';
const body = Buffer.from(JSON.stringify({ event: 'message', payload: { body: 'hai' } }));
const sign = (raw: Buffer, key = secret) => createHmac('sha512', key).update(raw).digest('hex');

describe('verifyWahaSignature', () => {
  it('accepts the signature WAHA would send', () => {
    expect(verifyWahaSignature(body, sign(body), secret, 'sha512')).toBe(true);
    expect(verifyWahaSignature(body, sign(body), secret)).toBe(true);
  });

  it('rejects a body that was changed after signing', () => {
    const tampered = Buffer.from(body.toString().replace('hai', 'transfer'));

    expect(verifyWahaSignature(tampered, sign(body), secret)).toBe(false);
  });

  it('rejects a signature made with another secret', () => {
    expect(verifyWahaSignature(body, sign(body, 'other'), secret)).toBe(false);
  });

  it('rejects everything while no secret is configured, even a "correct" empty-key signature', () => {
    expect(verifyWahaSignature(body, sign(body, ''), '')).toBe(false);
    expect(verifyWahaSignature(body, sign(body), undefined)).toBe(false);
  });

  it('rejects a missing signature, a missing body, malformed hex and another algorithm', () => {
    expect(verifyWahaSignature(body, undefined, secret)).toBe(false);
    expect(verifyWahaSignature(undefined, sign(body), secret)).toBe(false);
    expect(verifyWahaSignature(body, 'not-hex', secret)).toBe(false);
    expect(verifyWahaSignature(body, sign(body).slice(0, 20), secret)).toBe(false);
    expect(verifyWahaSignature(body, sign(body), secret, 'sha256')).toBe(false);
  });
});
