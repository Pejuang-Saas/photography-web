import {
  BadGatewayException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { WahaClient, WahaError } from '../waha/waha.client';
import { baseMime, isInlineMedia, mediaExtension } from './waha-ids';

/** Recorded on a message whose file WhatsApp no longer has, so WAHA is not asked again and again. */
export const EXPIRED_MARKER = 'EXPIRED';
const EXPIRED_MESSAGE = 'File sudah tidak tersedia di WhatsApp (kedaluwarsa)';

/** Larger attachments are refused instead of being loaded into memory. */
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

/**
 * Attachments live in WAHA only for as long as WAHA keeps them, and a payment proof must outlast
 * that. So the first time a file is needed (or right after it arrives) it is copied to private
 * storage, and everything after that is served from there.
 */
@Injectable()
export class WhatsappMediaService {
  private readonly logger = new Logger(WhatsappMediaService.name);
  private readonly inflight = new Map<string, Promise<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly waha: WahaClient,
    private readonly storage: StorageService,
  ) {}

  /** Copies the file in the background right after a message arrives. Never throws. */
  prefetch(messageId: string) {
    void this.ensureStored(messageId).catch((error) => {
      this.logger.warn(`Could not copy attachment of ${messageId}: ${error}`);
    });
  }

  /** The attachment, ready to stream, copied to private storage first if that has not happened. */
  async open(messageId: string) {
    const key = await this.ensureStored(messageId);
    const message = await this.prisma.whatsappMessage.findUniqueOrThrow({
      where: { id: messageId },
      select: { mediaMime: true, mediaFilename: true },
    });
    const file = await this.storage.getPrivateObject(key);
    const mime = baseMime(message.mediaMime) || baseMime(file.contentType);
    return {
      stream: file.body,
      contentType: isInlineMedia(mime) ? mime : 'application/octet-stream',
      inline: isInlineMedia(mime),
      length: file.length,
      filename: message.mediaFilename ?? `lampiran.${mediaExtension(mime)}`,
    };
  }

  /** Returns the storage key, downloading and storing the file once however many ask at once. */
  ensureStored(messageId: string): Promise<string> {
    const running = this.inflight.get(messageId);
    if (running) return running;

    const job = this.store(messageId).finally(() => this.inflight.delete(messageId));
    this.inflight.set(messageId, job);
    return job;
  }

  private async store(messageId: string) {
    const message = await this.prisma.whatsappMessage.findUnique({
      where: { id: messageId },
      include: { chat: { select: { chatId: true } } },
    });
    if (!message?.hasMedia) throw new NotFoundException('Pesan ini tidak memiliki lampiran');
    if (message.mediaKey) return message.mediaKey;
    // WhatsApp dropping a file is permanent, so there is no point asking again.
    if (message.mediaError === EXPIRED_MARKER) throw new GoneException(EXPIRED_MESSAGE);

    try {
      const file = await this.waha.downloadMessageMedia(
        message.chat.chatId,
        message.wahaId,
        MAX_MEDIA_BYTES,
      );
      const mime = baseMime(file.mimetype) || baseMime(message.mediaMime);
      const filename = file.filename ?? message.mediaFilename ?? undefined;
      const key = `crm-media/${message.chatId}/${message.id}.${mediaExtension(mime, filename)}`;

      await this.storage.putPrivateObject(key, file.buffer, mime || 'application/octet-stream');
      await this.prisma.whatsappMessage.update({
        where: { id: message.id },
        data: {
          mediaKey: key,
          mediaMime: mime || message.mediaMime,
          mediaFilename: filename ?? null,
          mediaError: null,
        },
      });
      return key;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const expired = error instanceof WahaError && error.status === 410;
      await this.prisma.whatsappMessage
        .update({
          where: { id: message.id },
          data: { mediaError: expired ? EXPIRED_MARKER : reason.slice(0, 200) },
        })
        .catch(() => undefined);
      if (expired) throw new GoneException(EXPIRED_MESSAGE);
      if (error instanceof WahaError && error.status === 413) {
        throw new PayloadTooLargeException(
          'Lampiran terlalu besar untuk ditampilkan (maksimal 25 MB)',
        );
      }
      throw new BadGatewayException(reason);
    }
  }
}
