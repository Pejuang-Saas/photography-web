import { PaymentPlan } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  packageId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  customerName: string;

  @IsString()
  @MinLength(10)
  @MaxLength(20)
  customerPhone: string;

  @IsEmail()
  @MaxLength(180)
  customerEmail: string;

  @IsDateString()
  sessionDate: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  timeSlot: string;

  @IsEnum(PaymentPlan)
  paymentPlan: PaymentPlan;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
