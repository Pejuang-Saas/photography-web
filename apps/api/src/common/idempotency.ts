import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export function requireIdempotencyKey(value?: string) {
  const key = value?.trim();
  if (!key || !IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new BadRequestException(
      'Idempotency-Key header is required and must contain 8-128 safe characters',
    );
  }
  return key;
}

export function hashIdempotencyPayload(payload: unknown) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function assertSameIdempotencyPayload(expected: string | null, received: string) {
  if (expected && expected !== received) {
    throw new ConflictException('Idempotency-Key was already used with a different payload');
  }
}
