import { PaymentPlan } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ID_MOBILE_MESSAGE, ID_MOBILE_PATTERN } from '../../common/phone';

export class CreateBookingDto {
  @IsUUID()
  packageId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  customerName: string;

  @IsString()
  @Matches(ID_MOBILE_PATTERN, { message: ID_MOBILE_MESSAGE })
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
