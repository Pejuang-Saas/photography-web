import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WahaClient, WahaError } from '../waha/waha.client';
import { messagingWindow } from './messaging-window';
import { typingDelayMs, WINDOW_CLOSED_MESSAGE } from './whatsapp-message';
import { WhatsappInboxService } from './whatsapp-inbox.service';
import { WhatsappTemplatesService } from './whatsapp-templates.service';

const DEFAULT_LIMIT_PER_MINUTE = 20;

/**
 * Sends from the CRM. The rules that protect the studio's number live here, on the server, so that
 * no client can get around them: free text only inside the 24-hour window, a cap on messages per
 * minute, and a short "typing…" pause so messages do not leave like a machine gun.
 */
@Injectable()
export class WhatsappSendService {
  private readonly logger = new Logger(WhatsappSendService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly waha: WahaClient,
    private readonly inbox: WhatsappInboxService,
    private readonly templates: WhatsappTemplatesService,
    private readonly config: ConfigService,
  ) {}

  /** Free text: allowed only while the customer's last message is under 24 hours old. */
  async sendText(chatId: string, text: string) {
    const chat = await this.chat(chatId);
    if (!messagingWindow(chat.lastInboundAt).open) {
      throw new ForbiddenException(WINDOW_CLOSED_MESSAGE);
    }
    return this.deliver(chat, text.trim());
  }

  /** A template works at any time; it is rendered here, never taken from the client. */
  async sendTemplate(chatId: string, templateId: string) {
    const chat = await this.chat(chatId);
    const { text } = await this.templates.render(templateId, chat);
    return this.deliver(chat, text);
  }

  async previewTemplate(chatId: string, templateId: string) {
    const chat = await this.chat(chatId);
    return this.templates.render(templateId, chat);
  }

  private async deliver(chat: { id: string; chatId: string }, text: string) {
    if (!text) throw new ConflictException('Pesan kosong');
    await this.assertConnected();
    await this.assertUnderRateLimit();
    await this.showTyping(chat.chatId, text);

    let sent: { id?: string };
    try {
      sent = await this.waha.sendTextToChat(chat.chatId, text);
    } catch (error) {
      throw new BadGatewayException(
        error instanceof WahaError || error instanceof Error ? error.message : String(error),
      );
    }

    // Stored at once so it shows up without waiting; the webhook delivers the same message and the
    // unique message id keeps it from being stored twice.
    if (sent?.id) {
      await this.inbox.ingestMessage({
        id: sent.id,
        timestamp: Math.floor(Date.now() / 1000),
        to: chat.chatId,
        fromMe: true,
        body: text,
        ack: 1,
      });
    }
    // Answering a conversation means it has been read.
    await this.prisma.whatsappChat.updateMany({
      where: { id: chat.id },
      data: { unreadCount: 0 },
    });
    return { sent: true, messageId: sent?.id ?? null };
  }

  private async chat(id: string) {
    const chat = await this.prisma.whatsappChat.findUnique({ where: { id } });
    if (!chat) throw new NotFoundException('Percakapan tidak ditemukan');
    return chat;
  }

  private async assertConnected() {
    const session = await this.waha.getSession().catch(() => null);
    if (session?.status !== 'WORKING') {
      throw new ConflictException('WhatsApp belum terhubung. Hubungkan dulu di Otomasi WhatsApp.');
    }
  }

  /** Counts everything the studio sent in the last minute, however it was sent. */
  private async assertUnderRateLimit() {
    const configured = Number(this.config.get<string>('WHATSAPP_SEND_LIMIT_PER_MINUTE'));
    const limit =
      Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_LIMIT_PER_MINUTE;
    const recent = await this.prisma.whatsappMessage.count({
      where: { fromMe: true, timestamp: { gt: new Date(Date.now() - 60_000) } },
    });
    if (recent >= limit) {
      throw new HttpException(
        `Terlalu banyak pesan dalam satu menit (batas ${limit}). Tunggu sebentar lalu coba lagi.`,
        429,
      );
    }
  }

  /** Best effort: if WAHA cannot show "typing…", the message still goes out. */
  private async showTyping(chatId: string, text: string) {
    try {
      await this.waha.startTyping(chatId);
      await this.pause(typingDelayMs(text));
      await this.waha.stopTyping(chatId);
    } catch (error) {
      this.logger.debug(`Typing indicator skipped: ${error}`);
    }
  }

  protected pause(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
