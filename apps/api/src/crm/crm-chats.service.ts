import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { messagingWindow } from './messaging-window';
import { canonicalPhone, phoneVariants } from './waha-ids';

export type ChatQuery = {
  search?: string;
  /** A category id, or "none" for conversations that have no category yet. */
  categoryId?: string;
  page?: number;
  pageSize?: number;
};

const MAX_PAGE_SIZE = 100;

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
    const pageSize = Math.min(
      Math.max(Math.trunc(query.pageSize as number) || 30, 1),
      MAX_PAGE_SIZE,
    );
    const page = Math.max(Math.trunc(query.page as number) || 1, 1);
    const where = await this.where(query);

    const [chats, total] = await Promise.all([
      this.prisma.whatsappChat.findMany({
        where,
        include: { category: true },
        orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.whatsappChat.count({ where }),
    ]);

    const bookings = await this.bookingsByPhone(chats.map((chat) => chat.phone));
    return {
      items: chats.map((chat) => this.present(chat, bookings.get(chat.phone ?? ''))),
      total,
      page,
      pageSize,
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

  /** One page of a conversation, oldest first, going back in time from `before`. */
  async messages(id: string, query: { before?: string; limit?: number }) {
    const limit = Math.min(Math.max(Math.trunc(query.limit as number) || 50, 1), 200);
    const before = query.before ? new Date(query.before) : undefined;
    const cursor = before && !Number.isNaN(before.getTime()) ? before : undefined;

    const exists = await this.prisma.whatsappChat.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Percakapan tidak ditemukan');

    const rows = await this.prisma.whatsappMessage.findMany({
      where: { chatId: id, ...(cursor && { timestamp: { lt: cursor } }) },
      orderBy: { timestamp: 'desc' },
      take: limit + 1,
      select: { id: true, fromMe: true, body: true, hasMedia: true, ack: true, timestamp: true },
    });
    return { items: rows.slice(0, limit).reverse(), hasMore: rows.length > limit };
  }

  private async where(query: ChatQuery): Promise<Prisma.WhatsappChatWhereInput> {
    const where: Prisma.WhatsappChatWhereInput = {};
    if (query.categoryId === 'none') where.categoryId = null;
    else if (query.categoryId) where.categoryId = query.categoryId;

    const search = query.search?.trim();
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

  /** The most recent booking for each phone, however the booking spelled the number. */
  private async bookingsByPhone(phones: Array<string | null>) {
    const canonical = [...new Set(phones.filter((phone): phone is string => Boolean(phone)))];
    const result = new Map<string, MatchedBooking>();
    if (!canonical.length) return result;

    const rows = await this.prisma.booking.findMany({
      where: { customerPhone: { in: canonical.flatMap(phoneVariants) } },
      orderBy: { createdAt: 'desc' },
      select: BOOKING_FIELDS,
    });
    for (const booking of rows) {
      const key = canonicalPhone(booking.customerPhone);
      if (key && !result.has(key)) result.set(key, booking); // newest first, so the first one wins
    }
    return result;
  }

  private present(chat: ChatWithCategory, booking?: MatchedBooking) {
    return {
      id: chat.id,
      chatId: chat.chatId,
      phone: chat.phone,
      name: chat.name,
      displayName: booking?.customerName ?? chat.name ?? chat.phone ?? chat.chatId.split('@')[0],
      lastMessagePreview: chat.lastMessagePreview,
      lastMessageAt: chat.lastMessageAt,
      lastMessageFromMe: chat.lastMessageFromMe,
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
