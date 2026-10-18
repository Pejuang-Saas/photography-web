import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WahaClient } from '../waha/waha.client';
import { WhatsappMediaService } from './whatsapp-media.service';
import {
  cleanDisplayName,
  isGroupJid,
  isUserChat,
  messageChatId,
  phoneFromChatId,
  previewOf,
  pushNameOf,
  toDate,
  canonicalPhone,
  type WahaMessage,
} from './waha-ids';

export type IngestResult = 'stored' | 'duplicate' | 'ignored';

/** Turns WAHA messages, from webhooks or from a sync, into conversations and messages. */
@Injectable()
export class WhatsappInboxService {
  private readonly logger = new Logger(WhatsappInboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly waha: WahaClient,
    private readonly media: WhatsappMediaService,
  ) {}

  /** Safe to call any number of times with the same message: it is stored once. */
  async ingestMessage(
    message: WahaMessage,
    knownName?: string | null,
    /**
     * `live` is a message that has just arrived (a webhook), as opposed to history pulled in later.
     * Only a live one counts as unread and has its attachment copied to storage straight away.
     */
    options: { live?: boolean } = {},
  ): Promise<IngestResult> {
    const chatId = messageChatId(message);
    // Groups never belong in the CRM: not by chat id, and not when from/to merely mention one.
    if (
      !message.id ||
      !isUserChat(chatId) ||
      isGroupJid(message.from) ||
      isGroupJid(message.to) ||
      typeof message.timestamp !== 'number'
    ) {
      return 'ignored';
    }

    const timestamp = toDate(message.timestamp);
    const fromMe = Boolean(message.fromMe);
    const hasMedia = Boolean(message.hasMedia);
    const body = message.body ?? '';
    // A customer's name only ever comes from messages they sent; our own would be ours.
    const name = fromMe
      ? cleanDisplayName(knownName)
      : (pushNameOf(message) ?? cleanDisplayName(knownName));

    const chat = await this.findOrCreateChat(chatId, name);

    let stored: { id: string };
    try {
      stored = await this.prisma.whatsappMessage.create({
        data: {
          wahaId: message.id,
          chatId: chat.id,
          fromMe,
          body,
          hasMedia,
          ack: message.ack ?? 0,
          timestamp,
          mediaMime: hasMedia ? (message.media?.mimetype ?? null) : null,
          mediaFilename: hasMedia ? (message.media?.filename ?? null) : null,
        },
        select: { id: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // A message stored before attachments were tracked learns what kind of file it has.
        if (hasMedia && message.media?.mimetype) {
          await this.prisma.whatsappMessage.updateMany({
            where: { wahaId: message.id, mediaMime: null },
            data: {
              mediaMime: message.media.mimetype,
              mediaFilename: message.media.filename ?? null,
            },
          });
        }
        return 'duplicate';
      }
      throw error;
    }

    // Conditional updates, so a backfill of old messages never rewinds the conversation.
    await this.prisma.whatsappChat.updateMany({
      where: { id: chat.id, OR: [{ lastMessageAt: null }, { lastMessageAt: { lt: timestamp } }] },
      data: {
        lastMessageAt: timestamp,
        lastMessagePreview: previewOf(body, hasMedia),
        lastMessageFromMe: fromMe,
      },
    });
    if (!fromMe) {
      await this.prisma.whatsappChat.updateMany({
        where: { id: chat.id, OR: [{ lastInboundAt: null }, { lastInboundAt: { lt: timestamp } }] },
        data: { lastInboundAt: timestamp },
      });
      if (options.live) {
        await this.prisma.whatsappChat.update({
          where: { id: chat.id },
          data: { unreadCount: { increment: 1 } },
        });
      }
    }
    if (options.live && hasMedia) this.media.prefetch(stored.id);
    return 'stored';
  }

  /** Delivery receipts only move forward (sent, delivered, read), except that an error can be set. */
  async ingestAck(wahaId: string | undefined, ack: number | undefined) {
    if (!wahaId || typeof ack !== 'number') return;
    await this.prisma.whatsappMessage.updateMany({
      where: { wahaId, ack: ack < 0 ? { lte: 1 } : { lt: ack } },
      data: { ack },
    });
  }

  private async findOrCreateChat(chatId: string, name?: string) {
    const existing = await this.prisma.whatsappChat.findUnique({ where: { chatId } });
    if (existing) {
      const data: Prisma.WhatsappChatUpdateInput = {};
      if (name && !existing.name) data.name = name;
      if (!existing.phone) {
        const phone = await this.resolvePhone(chatId);
        if (phone) data.phone = phone;
      }
      return Object.keys(data).length
        ? this.prisma.whatsappChat.update({ where: { id: existing.id }, data })
        : existing;
    }

    const phone = await this.resolvePhone(chatId);

    // The CRM can open an empty conversation for a booking before the customer ever writes, under
    // the plain number. Once WhatsApp shows the customer as a LID, that same person should not
    // end up in two conversations, so the empty one switches to the LID.
    if (phone && chatId.endsWith('@lid')) {
      const placeholder = await this.prisma.whatsappChat.findFirst({
        where: { phone, chatId: { endsWith: '@c.us' }, messages: { none: {} } },
      });
      if (placeholder) {
        return this.prisma.whatsappChat.update({
          where: { id: placeholder.id },
          data: { chatId, name: placeholder.name ?? name },
        });
      }
    }

    try {
      return await this.prisma.whatsappChat.create({ data: { chatId, phone, name } });
    } catch (error) {
      // The webhook and a sync can create the same conversation at the same moment.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.whatsappChat.findUniqueOrThrow({ where: { chatId } });
      }
      throw error;
    }
  }

  /** From the chat id itself, or for a LID by asking WAHA. A failed lookup is not an error. */
  private async resolvePhone(chatId: string) {
    const direct = phoneFromChatId(chatId);
    if (direct || !chatId.endsWith('@lid') || !this.waha.isConfigured()) return direct;
    try {
      return canonicalPhone((await this.waha.lidToPhone(chatId))?.split('@')[0]);
    } catch (error) {
      this.logger.warn(`Could not resolve ${chatId} to a phone number: ${error}`);
      return null;
    }
  }
}
