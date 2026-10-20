import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ID_MOBILE_MESSAGE, ID_MOBILE_PATTERN } from '../../common/phone';

// Every field accepts an empty string, which clears the stored value.
export class UpdateStudioSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  studioName?: string;

  @IsOptional()
  // Blank clears the number; anything else must be a real Indonesian mobile number.
  @ValidateIf((_object, value) => value !== undefined && value !== null && value !== '')
  @Matches(ID_MOBILE_PATTERN, { message: ID_MOBILE_MESSAGE })
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null && value !== '')
  @IsUrl({ require_protocol: true }, { message: 'Maps URL must start with http:// or https://' })
  @MaxLength(500)
  mapsUrl?: string;

  @IsOptional()
  @Matches(/^$|^(https?:\/\/(www\.)?instagram\.com\/)?@?[A-Za-z0-9._]{1,30}\/?$/, {
    message: 'Instagram handle is not valid',
  })
  instagramHandle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  region?: string;

  // Daily opening hours as HH:MM (24h); empty clears them.
  @IsOptional()
  @Matches(/^$|^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Open time must be HH:MM' })
  openTime?: string;

  @IsOptional()
  @Matches(/^$|^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Close time must be HH:MM' })
  closeTime?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  guarantees?: string[];

  /** The general conditions shown at checkout, one sentence each. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  reservationTerms?: string[];

  /** Whether customers can book online; off leaves only the catalog. */
  @IsOptional()
  @IsBoolean()
  reservationsOpen?: boolean;
}
