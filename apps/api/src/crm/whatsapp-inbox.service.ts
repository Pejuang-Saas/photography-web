import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WahaClient } from '../waha/waha.client';
import {
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
  ) {}

  /** Safe to call any number of times with the same message: it is stored once. */
  async ingestMessage(message: WahaMessage, knownName?: string | null): Promise<IngestResult> {
    const chatId = messageChatId(message);
    if (!message.id || !isUserChat(chatId) || typeof message.timestamp !== 'number') {
      return 'ignored';
    }

    const timestamp = toDate(message.timestamp);
    const fromMe = Boolean(message.fromMe);
    const hasMedia = Boolean(message.hasMedia);
    const body = message.body ?? '';
    // A customer's name only ever comes from messages they sent; our own would be ours.
    const name = fromMe
      ? (knownName ?? undefined)
      : (pushNameOf(message) ?? knownName ?? undefined);

    const chat = await this.findOrCreateChat(chatId, name);

    try {
      await this.prisma.whatsappMessage.create({
        data: {
          wahaId: message.id,
          chatId: chat.id,
          fromMe,
          body,
          hasMedia,
          ack: message.ack ?? 0,
          timestamp,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
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
    }
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
