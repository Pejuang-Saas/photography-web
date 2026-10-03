import { Logger } from '@nestjs/common';

export function logStructured(
  logger: Logger,
  level: 'log' | 'warn' | 'error',
  event: string,
  fields: Record<string, unknown> = {},
) {
  const payload = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  });
  logger[level](payload);
}
