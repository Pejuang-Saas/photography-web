import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WHATSAPP_TEMPLATE_BY_EVENT } from '../crm/whatsapp-template-defaults';
import { PrismaService } from '../prisma/prisma.service';
import { StudioService } from '../studio/studio.service';
import { buildContext, type BookingForEmail } from './email-context';
import { substitute } from './email-renderer';

export type ComposedWhatsapp =
  /** No template is tied to this event, or it does not exist yet: send the plain message. */
  | { status: 'none' }
  /** The admin switched the template off, so nothing is sent for this event. */
  | { status: 'inactive'; reason: string }
  | { status: 'ok'; templateCode: string; text: string };

/** Turns a booking event into the WhatsApp message the studio designed in the template builder. */
@Injectable()
export class WhatsappEventMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studio: StudioService,
    private readonly config: ConfigService,
  ) {}

  async compose(
    eventType: string,
    input: { booking: BookingForEmail; rejectionReason?: string },
  ): Promise<ComposedWhatsapp> {
    const code = WHATSAPP_TEMPLATE_BY_EVENT[eventType];
    if (!code) return { status: 'none' };
    const template = await this.prisma.whatsappTemplate.findUnique({ where: { code } });
    if (!template) return { status: 'none' };
    if (!template.isActive) {
      return { status: 'inactive', reason: `Template "${template.name}" dinonaktifkan` };
    }

    const { values } = buildContext({
      booking: input.booking,
      studio: await this.studio.getCurrent(),
      siteUrl: this.config.get<string>('WEB_URL'),
      apiUrl: this.config.get<string>('API_URL'),
      rejectionReason: input.rejectionReason,
    });
    return {
      status: 'ok',
      templateCode: code,
      text: substitute(template.body, values, (value) => value).trim(),
    };
  }
}
