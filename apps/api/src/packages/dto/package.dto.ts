import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServicePackageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPeople?: number;

  @IsOptional()
  features?: Prisma.InputJsonValue;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateServicePackageDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPeople?: number;

  @IsOptional()
  features?: Prisma.InputJsonValue;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
