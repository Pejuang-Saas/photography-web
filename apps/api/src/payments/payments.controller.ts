import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles, Session, UserSession } from '@thallesp/nestjs-better-auth';
import { PaymentSettingsService } from './payment-settings.service';
import { PaymentsService } from './payments.service';
import {
  ConfirmGatewayPaymentDto,
  CreateManualPaymentAccountDto,
  RejectPaymentDto,
  SubmitManualPaymentDto,
  UpdateManualPaymentAccountDto,
  UpdatePaymentSettingsDto,
  VerifyPaymentDto,
  MidtransWebhookDto,
} from './dto/payment.dto';
import { MidtransClient } from './gateways/midtrans.client';
import { MidtransWebhookService } from './gateways/midtrans.webhook.service';

@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentSettings: PaymentSettingsService,
    private readonly midtrans: MidtransClient,
    private readonly midtransWebhook: MidtransWebhookService,
  ) {}

  @Get('public/payment-settings')
  getPublicSettings() {
    return this.paymentSettings.getPublic();
  }

  @Post('public/bookings/:id/manual-payment')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  submitManualPayment(
    @Param('id') id: string,
    @Body() dto: SubmitManualPaymentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Payment proof image is required');
    return this.paymentsService.submitManualPayment(id, dto, file, idempotencyKey);
  }

  @Post('public/bookings/:id/gateway/confirm')
  confirmGatewayPayment(
    @Param('id') id: string,
    @Body() dto: ConfirmGatewayPaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.confirmGatewayPayment(id, dto, idempotencyKey);
  }

  @Post('public/bookings/:id/gateway/intent')
  createGatewayIntent(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.createGatewayIntent(id, idempotencyKey, this.midtrans);
  }

  @Post('webhooks/payments/midtrans')
  @HttpCode(200)
  handleMidtransWebhook(@Body() dto: MidtransWebhookDto) {
    return this.midtransWebhook.handle(dto);
  }

  @Roles(['admin'])
  @Get('admin/payment-settings')
  getAdminSettings() {
    return this.paymentSettings.getAdmin();
  }

  @Roles(['admin'])
  @Patch('admin/payment-settings')
  updateSettings(@Body() dto: UpdatePaymentSettingsDto) {
    return this.paymentSettings.update(dto);
  }

  @Roles(['admin'])
  @Get('admin/payment-accounts')
  listAccounts() {
    return this.paymentSettings.listAccounts();
  }

  @Roles(['admin'])
  @Post('admin/payment-accounts')
  createAccount(@Body() dto: CreateManualPaymentAccountDto) {
    return this.paymentSettings.createAccount(dto);
  }

  @Roles(['admin'])
  @Patch('admin/payment-accounts/:id')
  updateAccount(@Param('id') id: string, @Body() dto: UpdateManualPaymentAccountDto) {
    return this.paymentSettings.updateAccount(id, dto);
  }

  @Roles(['admin'])
  @Delete('admin/payment-accounts/:id')
  @HttpCode(204)
  removeAccount(@Param('id') id: string) {
    return this.paymentSettings.removeAccount(id);
  }

  @Roles(['admin'])
  @Post('admin/bookings/:id/verify-payment')
  verifyPayment(
    @Param('id') id: string,
    @Body() dto: VerifyPaymentDto,
    @Session() session: UserSession,
  ) {
    return this.paymentsService.verifyPayment(id, dto, session.user.id);
  }

  @Roles(['admin'])
  @Post('admin/bookings/:id/reject-payment')
  rejectPayment(
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
    @Session() session: UserSession,
  ) {
    return this.paymentsService.rejectPayment(id, dto, session.user.id);
  }
}
