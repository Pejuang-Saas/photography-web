import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/public.decorator';
import { WahaWebhookService, type WahaEnvelope } from './waha-webhook.service';
import { verifyWahaSignature } from './waha-signature';

/** Called by WAHA itself, so it has no session: the HMAC signature is what proves who is calling. */
@Public()
@SkipThrottle()
@Controller('webhooks/waha')
export class WahaWebhookController {
  constructor(
    private readonly config: ConfigService,
    private readonly webhook: WahaWebhookService,
  ) {}

  @Post()
  @HttpCode(200)
  async receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-webhook-hmac') signature: string | undefined,
    @Headers('x-webhook-hmac-algorithm') algorithm: string | undefined,
    @Body() body: WahaEnvelope,
  ) {
    const secret = this.config.get<string>('WAHA_WEBHOOK_SECRET');
    if (!secret) throw new ServiceUnavailableException('Webhook WAHA belum dikonfigurasi');
    if (!request.rawBody) throw new BadRequestException('Body permintaan kosong');
    if (!verifyWahaSignature(request.rawBody, signature, secret, algorithm)) {
      throw new UnauthorizedException('Tanda tangan webhook tidak valid');
    }
    return { outcome: await this.webhook.handle(body ?? {}) };
  }
}
