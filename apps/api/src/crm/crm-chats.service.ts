import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isLiveBooking, pickRelevantBooking } from './booking-relevance';
import { messagingWindow } from './messaging-window';
import { canonicalPhone, cleanDisplayName, phoneVariants } from './waha-ids';

export type ChatQuery = {
  search?: string;
  /** A category id, or "none" for conversations that have no category yet. */
  categoryId?: string;
  /** Where the previous page ended; leave out for the first page. */
  cursor?: string;
  limit?: number;
};

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

/**
 * Where a page ended: the activity time and id of its last conversation. The inbox is ordered by
 * exactly that pair, so the next page starts right after it. Unlike an offset, this stays correct
 * while conversations move to the top as messages arrive, and costs the same however deep it is.
 */
export function encodeCursor(chat: { lastActivityAt: Date; id: string }) {
  return Buffer.from(JSON.stringify([chat.lastActivityAt.toISOString(), chat.id])).toString(
    'base64url',
  );
}

export function decodeCursor(cursor: string): { at: Date; id: string } {
  try {
    const [at, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown[];
    const date = new Date(at as string);
    if (typeof at === 'string' && typeof id === 'string' && id && !Number.isNaN(date.getTime())) {
      return { at: date, id };
    }
  } catch {
    // falls through to the error below
  }
  throw new BadRequestException('Cursor tidak valid');
}

const BOOKING_FIELDS = {
  id: true,
  bookingCode: true,
  customerName: true,
  customerPhone: true,
  packageName: true,
  sessionDate: true,
  timeSlot: true,
  status: true,
  paymentStatus: true,
} satisfies Prisma.BookingSelect;

type MatchedBooking = Prisma.BookingGetPayload<{ select: typeof BOOKING_FIELDS }>;
type ChatWithCategory = Prisma.WhatsappChatGetPayload<{ include: { category: true } }>;

@Injectable()
export class CrmChatsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ChatQuery) {
    const limit = Math.min(
      Math.max(Math.trunc(query.limit as number) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const filters = await this.where(query);
    const after = query.cursor ? decodeCursor(query.cursor) : undefined;

    // One extra row tells whether there is another page, so no count over the whole inbox is needed.
    const rows = await this.prisma.whatsappChat.findMany({
      where: after
        ? {
            AND: [
              filters,
              {
                OR: [
                  { lastActivityAt: { lt: after.at } },
                  { lastActivityAt: after.at, id: { lt: after.id } },
                ],
              },
            ],
          }
        : filters,
      include: { category: true },
      orderBy: [{ lastActivityAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const chats = rows.slice(0, limit);

    const bookings = await this.bookingsByPhone(chats.map((chat) => chat.phone));
    return {
      items: chats.map((chat) => this.present(chat, bookings.get(chat.phone ?? ''))),
      hasMore,
      nextCursor: hasMore ? encodeCursor(chats[chats.length - 1]) : null,
    };
  }

  async get(id: string) {
    const chat = await this.prisma.whatsappChat.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!chat) throw new NotFoundException('Percakapan tidak ditemukan');
    const bookings = await this.bookingsByPhone([chat.phone]);
    return this.present(chat, bookings.get(chat.phone ?? ''));
  }

  /**
   * The conversation for a booking's phone number. A customer who has not written yet has none, so
   * an empty one is made, which lets the studio start with a template.
   */
  async openForBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { customerName: true, customerPhone: true },
    });
    if (!booking) throw new NotFoundException('Booking tidak ditemukan');
    const phone = canonicalPhone(booking.customerPhone);
    if (!phone) throw new UnprocessableEntityException('Nomor WhatsApp booking ini tidak valid');

    const existing = await this.prisma.whatsappChat.findFirst({
      where: { phone },
      orderBy: [{ lastActivityAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });
    if (existing) return { id: existing.id };

    try {
      const created = await this.prisma.whatsappChat.create({
        data: { chatId: `${phone}@c.us`, phone, name: booking.customerName },
        select: { id: true },
      });
      return { id: created.id };
    } catch (error) {
      // Two clicks at once: the other one created it first.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raced = await this.prisma.whatsappChat.findUniqueOrThrow({
          where: { chatId: `${phone}@c.us` },
          select: { id: true },
        });
        return { id: raced.id };
      }
      throw error;
    }
  }

  /**
   * One page of a conversation, oldest first, going back in time. The cursor is the oldest message
   * already shown (its time and id): several messages can share one second, and going by time alone
   * would skip the ones that share it with the cursor.
   */
  async messages(id: string, query: { before?: string; beforeId?: string; limit?: number }) {
    const limit = Math.min(Math.max(Math.trunc(query.limit as number) || 50, 1), 200);
    const before = query.before ? new Date(query.before) : undefined;
    const cursor = before && !Number.isNaN(before.getTime()) ? before : undefined;

    const exists = await this.prisma.whatsappChat.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Percakapan tidak ditemukan');

    const older: Prisma.WhatsappMessageWhereInput | undefined = cursor
      ? {
          OR: [
            { timestamp: { lt: cursor } },
            ...(query.beforeId ? [{ timestamp: cursor, id: { lt: query.beforeId } }] : []),
          ],
        }
      : undefined;

    const rows = await this.prisma.whatsappMessage.findMany({
      where: { chatId: id, ...older },
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        fromMe: true,
        body: true,
        hasMedia: true,
        ack: true,
        timestamp: true,
        mediaMime: true,
        mediaFilename: true,
      },
    });
    const items = rows
      .slice(0, limit)
      .reverse()
      .map(({ mediaMime, mediaFilename, ...message }) => ({
        ...message,
        media: message.hasMedia ? { mime: mediaMime, filename: mediaFilename } : null,
      }));
    return { items, hasMore: rows.length > limit };
  }

  /** The admin has opened the conversation. */
  async markRead(id: string) {
    const result = await this.prisma.whatsappChat.updateMany({
      where: { id },
      data: { unreadCount: 0 },
    });
    if (result.count !== 1) throw new NotFoundException('Percakapan tidak ditemukan');
  }

  /** What the sidebar badge and the "new message" toast need: how many, and who wrote last. */
  async unreadSummary() {
    const [total, latest] = await Promise.all([
      // Only conversations with something unread are summed, which the unread index serves.
      this.prisma.whatsappChat.aggregate({
        where: { unreadCount: { gt: 0 } },
        _sum: { unreadCount: true },
      }),
      this.prisma.whatsappChat.findFirst({
        where: { unreadCount: { gt: 0 } },
        orderBy: [{ lastActivityAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          name: true,
          phone: true,
          chatId: true,
          lastMessagePreview: true,
          lastMessageAt: true,
        },
      }),
    ]);
    return {
      total: total._sum.unreadCount ?? 0,
      latest: latest
        ? {
            chatId: latest.id,
            displayName: latest.name ?? latest.phone ?? latest.chatId.split('@')[0],
            preview: latest.lastMessagePreview,
            at: latest.lastMessageAt,
          }
        : null,
    };
  }

  private async where(query: ChatQuery): Promise<Prisma.WhatsappChatWhereInput> {
    const where: Prisma.WhatsappChatWhereInput = {};
    if (query.categoryId === 'none') where.categoryId = null;
    else if (query.categoryId) where.categoryId = query.categoryId;

    const search = cleanDisplayName(query.search);
    if (search) {
      const digits = search.replace(/\D/g, '').replace(/^0/, '');
      // A customer is usually known by the name on their booking, not by their WhatsApp profile.
      const named = await this.prisma.booking.findMany({
        where: { customerName: { contains: search, mode: 'insensitive' } },
        select: { customerPhone: true },
        take: 50,
      });
      const phones = named.flatMap((booking) => canonicalPhone(booking.customerPhone) ?? []);
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
        ...(phones.length ? [{ phone: { in: phones } }] : []),
      ];
    }
    return where;
  }

  /** The booking to show for each phone (a live one first, else the newest), however it was spelled. */
  private async bookingsByPhone(phones: Array<string | null>) {
    const canonical = [...new Set(phones.filter((phone): phone is string => Boolean(phone)))];
    const result = new Map<string, MatchedBooking>();
    if (!canonical.length) return result;

    const rows = await this.prisma.booking.findMany({
      where: { customerPhone: { in: canonical.flatMap(phoneVariants) } },
      orderBy: { createdAt: 'desc' },
      select: BOOKING_FIELDS,
    });
    const byPhone = new Map<string, MatchedBooking[]>();
    for (const booking of rows) {
      const key = canonicalPhone(booking.customerPhone);
      if (key) byPhone.set(key, [...(byPhone.get(key) ?? []), booking]); // newest first
    }
    for (const [key, bookings] of byPhone) {
      const chosen = pickRelevantBooking(bookings);
      if (chosen) result.set(key, chosen);
    }
    return result;
  }

  private present(chat: ChatWithCategory, booking?: MatchedBooking) {
    return {
      id: chat.id,
      chatId: chat.chatId,
      phone: chat.phone,
      name: chat.name,
      // The name on a live booking is the one the studio knows the customer by. A lapsed booking is
      // history and may carry a throwaway name, so the WhatsApp name wins over it.
      displayName:
        (booking && isLiveBooking(booking.status) ? booking.customerName : undefined) ??
        chat.name ??
        booking?.customerName ??
        chat.phone ??
        chat.chatId.split('@')[0],
      lastMessagePreview: chat.lastMessagePreview,
      lastMessageAt: chat.lastMessageAt,
      lastMessageFromMe: chat.lastMessageFromMe,
      /** What the inbox is ordered by; the client uses it to keep merged pages in order. */
      lastActivityAt: chat.lastActivityAt,
      unreadCount: chat.unreadCount,
      window: messagingWindow(chat.lastInboundAt),
      category: chat.category
        ? { id: chat.category.id, name: chat.category.name, color: chat.category.color }
        : null,
      booking: booking
        ? {
            id: booking.id,
            bookingCode: booking.bookingCode,
            customerName: booking.customerName,
            packageName: booking.packageName,
            sessionDate: booking.sessionDate,
            timeSlot: booking.timeSlot,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
          }
        : null,
    };
  }
}
