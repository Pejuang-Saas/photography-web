import { Injectable, Logger } from '@nestjs/common';
import { WahaClient } from '../waha/waha.client';
import { WhatsappInboxService } from './whatsapp-inbox.service';
import type { WahaMessage } from './waha-ids';

export type WahaEnvelope = {
  event?: string;
  session?: string;
  payload?: Record<string, unknown> | null;
};

/** What happened to a webhook, for the response body and the logs. */
export type WebhookOutcome =
  'message:stored' | 'message:duplicate' | 'message:ignored' | 'ack' | 'ignored';

@Injectable()
export class WahaWebhookService {
  private readonly logger = new Logger(WahaWebhookService.name);

  constructor(
    private readonly waha: WahaClient,
    private readonly inbox: WhatsappInboxService,
  ) {}

  async handle(envelope: WahaEnvelope): Promise<WebhookOutcome> {
    // The WAHA server may be shared; only this application's session concerns the CRM.
    if (envelope.session !== this.waha.sessionName() || !envelope.payload) return 'ignored';

    switch (envelope.event) {
      case 'message':
      case 'message.any': {
        const outcome = await this.inbox.ingestMessage(envelope.payload as unknown as WahaMessage);
        return `message:${outcome}`;
      }
      case 'message.ack': {
        const { id, ack } = envelope.payload as { id?: string; ack?: number };
        await this.inbox.ingestAck(id, ack);
        return 'ack';
      }
      default:
        this.logger.debug(`Ignoring WAHA event ${envelope.event}`);
        return 'ignored';
    }
  }
}
