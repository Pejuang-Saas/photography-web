import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WhatsappChat } from '@prisma/client';
import { buildContext } from '../notifications/email-context';
import { studioValues } from '../notifications/email-context';
import { substitute } from '../notifications/email-renderer';
import { emptyValues } from '../notifications/email-variables';
import { PrismaService } from '../prisma/prisma.service';
import { StudioService } from '../studio/studio.service';
import { isLiveBooking, pickRelevantBooking } from './booking-relevance';
import { phoneVariants } from './waha-ids';
import { bookingPlaceholdersIn, placeholdersIn } from './whatsapp-message';

@Injectable()
export class WhatsappTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studio: StudioService,
    private readonly config: ConfigService,
  ) {}

  /** Templates the admin may pick from; switched-off ones are not offered. */
  list() {
    return this.prisma.whatsappTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, code: true, name: true },
    });
  }

  /** The finished message for this conversation, exactly as it would be sent. */
  async render(templateId: string, chat: Pick<WhatsappChat, 'phone' | 'name'>) {
    const template = await this.prisma.whatsappTemplate.findFirst({
      where: { id: templateId, isActive: true },
    });
    if (!template) throw new NotFoundException('Template tidak ditemukan atau sudah dinonaktifkan');

    const booking = await this.latestBooking(chat.phone);
    const missing = booking ? [] : bookingPlaceholdersIn(template.body);
    if (missing.length) {
      throw new UnprocessableEntityException(
        `Template ini memakai data booking (${missing.map((name) => `{${name}}`).join(', ')}), tetapi nomor ini belum punya booking yang aktif`,
      );
    }

    const studio = await this.studio.getCurrent();
    const siteUrl = this.config.get<string>('WEB_URL');
    const values = booking
      ? buildContext({ booking, studio, siteUrl, apiUrl: this.config.get<string>('API_URL') })
          .values
      : {
          ...emptyValues(),
          ...studioValues(studio, siteUrl),
          customer_name: chat.name?.trim() || 'Kakak',
        };

    const text = substitute(template.body, values, (value) => value).trim();
    // A placeholder that is not in the registry is left as typed, which must never reach a customer.
    const leftover = placeholdersIn(text);
    if (leftover.length) {
      throw new UnprocessableEntityException(
        `Template berisi variabel yang tidak dikenal: ${leftover.map((name) => `{${name}}`).join(', ')}`,
      );
    }
    return { template: { id: template.id, name: template.name }, text };
  }

  /** The live booking for this number, or null when it has none. */
  private async latestBooking(phone: string | null) {
    if (!phone) return null;
    const bookings = await this.prisma.booking.findMany({
      where: { customerPhone: { in: phoneVariants(phone) } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        invoice: true,
        payments: {
          where: { status: { in: ['PAID_DP', 'PAID_FULL'] } },
          select: { amount: true },
        },
      },
    });
    // Only a live booking is worth quoting. A lapsed one is history, and a message that repeats its
    // schedule would mislead the customer, so it counts as having no booking.
    const picked = pickRelevantBooking(bookings);
    return picked && isLiveBooking(picked.status) ? picked : null;
  }
}
