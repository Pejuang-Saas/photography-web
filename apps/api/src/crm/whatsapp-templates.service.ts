import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type WhatsappChat } from '@prisma/client';
import { randomBytes } from 'crypto';
import { buildContext, sampleContext, studioValues } from '../notifications/email-context';
import { substitute } from '../notifications/email-renderer';
import { EMAIL_VARIABLES, emptyValues } from '../notifications/email-variables';
import { PrismaService } from '../prisma/prisma.service';
import { StudioService } from '../studio/studio.service';
import { WahaClient, WahaError } from '../waha/waha.client';
import type { WhatsappTemplateContentDto } from './dto/whatsapp-template.dto';
import { isLiveBooking, pickRelevantBooking } from './booking-relevance';
import { canonicalPhone, phoneVariants } from './waha-ids';
import { bookingPlaceholdersIn, placeholdersIn } from './whatsapp-message';
import {
  SYSTEM_WHATSAPP_TEMPLATES,
  WHATSAPP_TRIGGER_LABEL,
  type SystemWhatsappTemplate,
} from './whatsapp-template-defaults';
import { checkTemplateHealth } from './whatsapp-template-health';
import { BOOKING_BOUND_VARIABLES, EVENT_ONLY_VARIABLES } from './whatsapp-template-variables';

function normalize(dto: WhatsappTemplateContentDto) {
  return { name: dto.name.trim(), category: dto.category, body: dto.body.trim() };
}

/** Refuses what would send a broken message; advice-only findings are left to the editor. */
function assertSendable(body: string) {
  const health = checkTemplateHealth(body);
  const errors = health.issues.filter((issue) => issue.severity === 'error');
  if (errors.length) throw new BadRequestException(errors.map((issue) => issue.message));
}

@Injectable()
export class WhatsappTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappTemplatesService.name);
  private defaultsEnsured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly studio: StudioService,
    private readonly config: ConfigService,
    private readonly waha: WahaClient,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureDefaults();
    } catch (error) {
      // Not worth stopping the API; the admin list tries again on first use.
      this.logger.warn(`Could not create the default templates: ${(error as Error).message}`);
    }
  }

  /** The placeholders the builder offers, with a sample value each for the preview. */
  variables() {
    return EMAIL_VARIABLES.map((variable) => ({
      ...variable,
      /** Needs a booking, so a conversation without one cannot fill it. */
      needsBooking: BOOKING_BOUND_VARIABLES.has(variable.key),
    }));
  }

  /** Creates the built-in templates on first use; never overwrites what an admin has edited. */
  async ensureDefaults() {
    if (this.defaultsEnsured) return;
    for (const template of SYSTEM_WHATSAPP_TEMPLATES) {
      try {
        await this.prisma.whatsappTemplate.upsert({
          where: { code: template.code },
          create: { ...template, isSystem: true, isActive: true },
          update: { isSystem: true },
        });
      } catch (error) {
        // The API and the worker both start up; the other one created it a moment earlier.
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
          throw error;
        }
      }
    }
    this.defaultsEnsured = true;
  }

  /** Every template for the builder's table, switched-off ones included. */
  async adminList() {
    await this.ensureDefaults();
    const templates = await this.prisma.whatsappTemplate.findMany({
      orderBy: [{ isSystem: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return templates.map((template) => ({
      ...template,
      trigger: WHATSAPP_TRIGGER_LABEL[template.code] ?? null,
      health: checkTemplateHealth(template.body).level,
    }));
  }

  async get(id: string) {
    await this.ensureDefaults();
    const template = await this.prisma.whatsappTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template tidak ditemukan');
    return { ...template, trigger: WHATSAPP_TRIGGER_LABEL[template.code] ?? null };
  }

  async create(dto: WhatsappTemplateContentDto) {
    await this.ensureDefaults();
    const content = normalize(dto);
    assertSendable(content.body);
    const last = await this.prisma.whatsappTemplate.aggregate({ _max: { sortOrder: true } });
    return this.prisma.whatsappTemplate.create({
      data: {
        ...content,
        code: this.newCustomCode(),
        isActive: dto.isActive ?? true,
        isSystem: false,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async update(id: string, dto: WhatsappTemplateContentDto) {
    const existing = await this.get(id);
    const content = normalize(dto);
    assertSendable(content.body);
    return this.prisma.whatsappTemplate.update({
      where: { id: existing.id },
      data: { ...content, isActive: dto.isActive ?? existing.isActive },
    });
  }

  async setActive(id: string, isActive: boolean) {
    const existing = await this.get(id);
    return this.prisma.whatsappTemplate.update({ where: { id: existing.id }, data: { isActive } });
  }

  async duplicate(id: string) {
    const source = await this.get(id);
    const last = await this.prisma.whatsappTemplate.aggregate({ _max: { sortOrder: true } });
    return this.prisma.whatsappTemplate.create({
      data: {
        code: this.newCustomCode(),
        name: `${source.name} (Salinan)`.slice(0, 120),
        category: source.category,
        body: source.body,
        isActive: source.isActive,
        isSystem: false,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
  }

  /** Puts a built-in template back to the text it shipped with. */
  async reset(id: string) {
    const existing = await this.get(id);
    const original: SystemWhatsappTemplate | undefined = SYSTEM_WHATSAPP_TEMPLATES.find(
      (template) => template.code === existing.code,
    );
    if (!original) {
      throw new ConflictException('Hanya template bawaan yang bisa dikembalikan ke teks awal');
    }
    return this.prisma.whatsappTemplate.update({
      where: { id: existing.id },
      data: { name: original.name, category: original.category, body: original.body },
    });
  }

  async remove(id: string) {
    const existing = await this.get(id);
    if (existing.isSystem) {
      throw new ConflictException(
        'Template bawaan tidak bisa dihapus; nonaktifkan atau ubah isinya',
      );
    }
    await this.prisma.whatsappTemplate.delete({ where: { id: existing.id } });
  }

  /** The draft as the customer would see it, filled with example data, and how healthy it is. */
  async preview(body: string) {
    const studio = await this.studio.getCurrent();
    const { values } = sampleContext(studio, this.config.get<string>('WEB_URL'));
    return {
      text: substitute(body, values, (value) => value),
      health: checkTemplateHealth(body),
      variables: placeholdersIn(body),
    };
  }

  /**
   * Sends the draft, filled with example data, to one number so the admin can see it on a real
   * phone. Marked as a test so it is never mistaken for a message meant for the customer.
   */
  async sendTest(body: string, phone: string) {
    assertSendable(body.trim());
    const number = canonicalPhone(phone);
    if (!number) throw new BadRequestException('Nomor WhatsApp tidak valid');
    const { text } = await this.preview(body);
    try {
      await this.waha.sendTextToChat(`${number}@c.us`, `[UJI COBA TEMPLATE]\n\n${text}`);
    } catch (error) {
      if (error instanceof WahaError) throw new UnprocessableEntityException(error.message);
      throw error;
    }
    return { sent: true, to: number };
  }

  private newCustomCode() {
    return `CUSTOM_${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Templates the admin may pick from in the CRM. Switched-off ones are not offered, nor are those
   * that need something only an automatic event knows.
   */
  async list() {
    await this.ensureDefaults();
    const templates = await this.prisma.whatsappTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, code: true, name: true, category: true, body: true },
    });
    return templates
      .filter(
        (template) => !placeholdersIn(template.body).some((name) => EVENT_ONLY_VARIABLES.has(name)),
      )
      .map(({ body, ...template }) => template);
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
