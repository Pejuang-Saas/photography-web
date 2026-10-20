import { Type } from 'class-transformer';
import { PaymentPlan } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ID_MOBILE_MESSAGE, ID_MOBILE_PATTERN } from '../../common/phone';

/** Which add-on and how many. The price is never taken from the client. */
export class BookingAddOnDto {
  @IsUUID()
  addOnId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;
}

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => BookingAddOnDto)
  addOns?: BookingAddOnDto[];
}
