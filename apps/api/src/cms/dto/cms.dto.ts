import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGalleryCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateGalleryCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateGalleryItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(250)
  altText: string;

  @IsUUID()
  mediaAssetId: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  caption?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateGalleryItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(250)
  altText?: string;

  @IsOptional()
  @IsUUID()
  mediaAssetId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  caption?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class CreateMarqueeItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(250)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMarqueeItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(250)
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateTestimonialDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  customerName: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  university?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  quote: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsUUID()
  mediaAssetId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateTestimonialDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  university?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  quote?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsUUID()
  mediaAssetId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class CreateFaqItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  question: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  answer: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateFaqItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  question?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  answer?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
