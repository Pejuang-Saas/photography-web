import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { WahaClient } from '../waha/waha.client';
import { WhatsappInboxService } from './whatsapp-inbox.service';
import { isUserChat } from './waha-ids';

export type SyncResult = { chats: number; stored: number; duplicates: number; failedChats: number };

/** Pulls recent conversations from the connected session, to fill in history from before webhooks. */
@Injectable()
export class WhatsappSyncService {
  private readonly logger = new Logger(WhatsappSyncService.name);

  constructor(
    private readonly waha: WahaClient,
    private readonly inbox: WhatsappInboxService,
  ) {}

  async sync(options: { chats?: number; messages?: number } = {}): Promise<SyncResult> {
    const chatLimit = clamp(options.chats, 1, 100, 50);
    const messageLimit = clamp(options.messages, 1, 100, 30);

    const session = await this.waha.getSession().catch(() => null);
    if (session?.status !== 'WORKING') {
      throw new ConflictException('WhatsApp belum terhubung, hubungkan dulu sebelum menyinkronkan');
    }

    const overview = await this.waha.listChats(chatLimit);
    const result: SyncResult = { chats: 0, stored: 0, duplicates: 0, failedChats: 0 };

    for (const chat of overview) {
      if (!isUserChat(chat.id)) continue;
      try {
        const messages = await this.waha.listMessages(chat.id, messageLimit);
        // WAHA returns newest first; storing oldest first keeps the conversation summary correct.
        for (const message of [...messages].reverse()) {
          const outcome = await this.inbox.ingestMessage(message, chat.name);
          if (outcome === 'stored') result.stored += 1;
          if (outcome === 'duplicate') result.duplicates += 1;
        }
        result.chats += 1;
      } catch (error) {
        // One broken conversation must not stop the rest.
        result.failedChats += 1;
        this.logger.warn(`Sync of ${chat.id} failed: ${error}`);
      }
    }
    return result;
  }
}

function clamp(value: number | undefined, min: number, max: number, fallback: number) {
  return Number.isFinite(value)
    ? Math.min(Math.max(Math.trunc(value as number), min), max)
    : fallback;
}
