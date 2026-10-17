import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CTA_COLORS } from '../email-renderer';

/** Everything an admin edits about a template. Blank optional strings clear the field. */
export class EmailTemplateContentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  heading: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  bodyText: string;

  @IsBoolean()
  includeBookingTable: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  ctaText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ctaUrl?: string;

  @IsIn([...CTA_COLORS])
  ctaColor: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  footerText?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetEmailTemplateActiveDto {
  @IsBoolean()
  isActive: boolean;
}
