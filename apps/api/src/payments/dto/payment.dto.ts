import { GatewayEnvironment, GatewayProvider, PaymentMode, PaymentPlan } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class SubmitManualPaymentDto {
  @IsUUID()
  manualAccountId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  senderName: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  amount: number;
}

export class ConfirmGatewayPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  externalReference?: string;
}

export class VerifyPaymentDto {
  @IsEnum(PaymentPlan)
  paymentPlan: PaymentPlan;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  amount: number;
}

export class RejectPaymentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

export class UpdatePaymentSettingsDto {
  @IsEnum(PaymentMode)
  activeMode: PaymentMode;

  @IsOptional()
  @IsBoolean()
  allowDownPayment?: boolean;

  @IsOptional()
  @IsEnum(GatewayProvider)
  gatewayProvider?: GatewayProvider;

  @IsOptional()
  @IsEnum(GatewayEnvironment)
  gatewayEnvironment?: GatewayEnvironment;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  merchantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  clientKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  serverKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  publicKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  secretKey?: string;
}

export class CreateManualPaymentAccountDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  bankName: string;

  @IsString()
  @MinLength(4)
  @MaxLength(80)
  accountNumber: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  accountHolder: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateManualPaymentAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(80)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  accountHolder?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
