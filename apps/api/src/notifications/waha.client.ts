import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WahaClient {
  constructor(private readonly config: ConfigService) {}

  isEnabled() {
    return (
      this.config.get<string>('WAHA_ENABLED') === 'true' &&
      Boolean(this.config.get<string>('WAHA_BASE_URL')) &&
      Boolean(this.config.get<string>('WAHA_API_KEY'))
    );
  }

  async sendText(phoneOrChatId: string, text: string) {
    if (!this.isEnabled()) throw new Error('WAHA delivery is disabled or not configured');

    const baseUrl = this.config.getOrThrow<string>('WAHA_BASE_URL').replace(/\/$/, '');
    const apiKey = this.config.getOrThrow<string>('WAHA_API_KEY');
    const session = this.config.get<string>('WAHA_SESSION') ?? 'default';
    const response = await fetch(`${baseUrl}/api/sendText`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        session,
        chatId: this.chatId(phoneOrChatId),
        text,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`WAHA sendText failed (${response.status}): ${body.slice(0, 500)}`);
    }
  }

  private chatId(value: string) {
    if (value.includes('@')) return value;
    const digits = value.replace(/\D/g, '');
    if (digits.length < 8)
      throw new Error('Customer phone number is invalid for WhatsApp delivery');
    return `${digits}@c.us`;
  }
}
