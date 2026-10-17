import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { LOGO_CID, logoDataUrl, studioLogo } from '../common/logo';
import { PrismaService } from '../prisma/prisma.service';
import { StudioService } from '../studio/studio.service';
import { EmailTemplateContentDto } from './dto/email-template.dto';
import type { EmailAttachmentSpec } from './email-attachments';
import {
  buildContext,
  sampleContext,
  type BookingForEmail,
  type StudioForEmail,
} from './email-context';
import { renderEmail, type RenderedEmail } from './email-renderer';
import {
  DEFAULT_UPGRADES,
  SYSTEM_TEMPLATES,
  TEMPLATE_TRIGGER_LABEL,
  type SystemTemplate,
  type TemplateContent,
} from './email-template-defaults';
import { EMAIL_VARIABLES, unknownVariables } from './email-variables';

export type ComposedEmail =
  | ({ status: 'ok'; templateCode: string; attachments: EmailAttachmentSpec[] } & RenderedEmail)
  | { status: 'inactive'; templateCode: string; reason: string };

const blankToNull = (value: string | undefined) => value?.trim() || null;

function normalize(dto: EmailTemplateContentDto): TemplateContent {
  return {
    name: dto.name.trim(),
    description: blankToNull(dto.description),
    subject: dto.subject.trim(),
    heading: dto.heading.trim(),
    bodyText: dto.bodyText.trim(),
    includeBookingTable: dto.includeBookingTable,
    ctaText: blankToNull(dto.ctaText),
    ctaUrl: blankToNull(dto.ctaUrl),
    ctaColor: dto.ctaColor,
    footerText: blankToNull(dto.footerText),
  };
}

/** Collects every problem at once so the admin can fix them in a single pass. */
export function validateTemplate(content: TemplateContent) {
  const problems: string[] = [];
  const fields: Array<[string, string | null]> = [
    ['subjek', content.subject],
    ['judul', content.heading],
    ['isi email', content.bodyText],
    ['teks tombol', content.ctaText],
    ['tautan tombol', content.ctaUrl],
    ['footer', content.footerText],
  ];

  for (const [label, value] of fields) {
    const unknown = unknownVariables(value);
    if (unknown.length) {
      problems.push(
        `Variabel tidak dikenal di ${label}: ${unknown.map((n) => `{${n}}`).join(', ')}`,
      );
    }
  }
  if (/[\r\n]/.test(content.subject)) problems.push('Subjek harus satu baris');
  if (/[\r\n]/.test(content.heading)) problems.push('Judul harus satu baris');
  if (Boolean(content.ctaText) !== Boolean(content.ctaUrl)) {
    problems.push('Teks tombol dan tautan tombol harus diisi bersama, atau dikosongkan bersama');
  }
  if (content.ctaUrl && !/^(https?:\/\/\S+|\{[A-Za-z0-9_]+\}\S*)$/.test(content.ctaUrl)) {
    problems.push('Tautan tombol harus diawali http://, https://, atau sebuah variabel tautan');
  }
  if (problems.length) throw new BadRequestException(problems);
}

@Injectable()
export class EmailTemplatesService {
  private defaultsEnsured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly studio: StudioService,
  ) {}

  variables() {
    return EMAIL_VARIABLES;
  }

  /** Creates the built-in templates on first use; never overwrites what an admin has edited. */
  async ensureDefaults() {
    if (this.defaultsEnsured) return;
    for (const template of SYSTEM_TEMPLATES) {
      try {
        await this.prisma.emailTemplate.upsert({
          where: { code: template.code },
          create: { ...template, isSystem: true, isActive: true },
          update: {},
        });
      } catch (error) {
        // Another process (API and worker both start up) created it a moment earlier.
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
          throw error;
        }
      }
    }
    // Move studios that still have the previous shipped text onto the new one. The match is
    // exact, so a template an admin has edited in the meantime is left alone.
    for (const upgrade of DEFAULT_UPGRADES) {
      await this.prisma.emailTemplate.updateMany({
        where: { code: upgrade.code, ...upgrade.from },
        data: upgrade.to,
      });
    }
    this.defaultsEnsured = true;
  }

  async list() {
    await this.ensureDefaults();
    const templates = await this.prisma.emailTemplate.findMany({
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    });
    return templates.map((template) => ({
      ...template,
      trigger: TEMPLATE_TRIGGER_LABEL[template.code] ?? null,
    }));
  }

  async get(id: string) {
    await this.ensureDefaults();
    const template = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async create(dto: EmailTemplateContentDto) {
    await this.ensureDefaults();
    const content = normalize(dto);
    validateTemplate(content);
    return this.prisma.emailTemplate.create({
      data: {
        ...content,
        code: this.newCustomCode(),
        isActive: dto.isActive ?? true,
        isSystem: false,
      },
    });
  }

  async update(id: string, dto: EmailTemplateContentDto) {
    const existing = await this.get(id);
    const content = normalize(dto);
    validateTemplate(content);
    return this.prisma.emailTemplate.update({
      where: { id: existing.id },
      data: { ...content, isActive: dto.isActive ?? existing.isActive },
    });
  }

  async setActive(id: string, isActive: boolean) {
    const existing = await this.get(id);
    return this.prisma.emailTemplate.update({ where: { id: existing.id }, data: { isActive } });
  }

  async duplicate(id: string) {
    const source = await this.get(id);
    return this.prisma.emailTemplate.create({
      data: {
        code: this.newCustomCode(),
        name: `${source.name} (Salinan)`.slice(0, 120),
        description: source.description,
        subject: source.subject,
        heading: source.heading,
        bodyText: source.bodyText,
        includeBookingTable: source.includeBookingTable,
        ctaText: source.ctaText,
        ctaUrl: source.ctaUrl,
        ctaColor: source.ctaColor,
        footerText: source.footerText,
        isActive: source.isActive,
        isSystem: false,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.get(id);
    if (existing.isSystem) {
      throw new ConflictException(
        'Template bawaan tidak bisa dihapus; nonaktifkan atau ubah isinya',
      );
    }
    await this.prisma.emailTemplate.delete({ where: { id: existing.id } });
  }

  /** Puts a built-in template back to the text it shipped with. */
  async reset(id: string) {
    const existing = await this.get(id);
    const original: SystemTemplate | undefined = SYSTEM_TEMPLATES.find(
      (template) => template.code === existing.code,
    );
    if (!existing.isSystem || !original) {
      throw new ConflictException('Hanya template bawaan yang bisa dikembalikan ke aslinya');
    }
    const { code: _code, ...content } = original;
    return this.prisma.emailTemplate.update({
      where: { id: existing.id },
      data: { ...content, isActive: true },
    });
  }

  /** Renders an unsaved draft with example booking data and the studio's real details. */
  async preview(dto: EmailTemplateContentDto) {
    const content = normalize(dto);
    validateTemplate(content);
    const { values, bookingRows } = sampleContext(await this.studioForEmail(), this.siteUrl());
    // The browser cannot resolve a `cid:` reference, so the preview embeds the logo as a data URL.
    return renderEmail({
      template: content,
      values,
      bookingRows,
      logoSrc: logoDataUrl() ?? undefined,
    });
  }

  /** Renders the template for a real booking, or reports that it is switched off. */
  async compose(
    code: string,
    input: { booking: BookingForEmail; rejectionReason?: string },
  ): Promise<ComposedEmail> {
    await this.ensureDefaults();
    const template = await this.prisma.emailTemplate.findUnique({ where: { code } });
    if (!template) {
      return { status: 'inactive', templateCode: code, reason: `Template ${code} tidak ditemukan` };
    }
    if (!template.isActive) {
      return {
        status: 'inactive',
        templateCode: code,
        reason: `Template "${template.name}" dinonaktifkan`,
      };
    }

    const { values, bookingRows } = buildContext({
      booking: input.booking,
      studio: await this.studioForEmail(),
      siteUrl: this.siteUrl(),
      apiUrl: process.env.API_URL,
      rejectionReason: input.rejectionReason,
    });
    // The logo travels inside the email (a `cid:` image) instead of being fetched from the website.
    const hasLogo = studioLogo() !== null;
    return {
      status: 'ok',
      templateCode: code,
      attachments: hasLogo ? [{ type: 'logo' }] : [],
      ...renderEmail({
        template,
        values,
        bookingRows,
        logoSrc: hasLogo ? `cid:${LOGO_CID}` : undefined,
      }),
    };
  }

  private studioForEmail(): Promise<StudioForEmail> {
    return this.studio.getCurrent();
  }

  private siteUrl() {
    return process.env.WEB_URL;
  }

  private newCustomCode() {
    return `CUSTOM_${randomBytes(4).toString('hex').toUpperCase()}`;
  }
}
