import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { GalleryStatus } from '@prisma/client';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const blankToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : trim({ value });

export class CreateGalleryDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  driveFolderUrl: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  maxSelections?: number;

  /** How many customers may pick before newcomers can only look. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  maxCustomers?: number;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsEnum(GalleryStatus)
  status?: GalleryStatus;
}

export class UpdateGalleryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(GalleryStatus)
  status?: GalleryStatus;

  /** null removes the limit. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(100_000)
  maxSelections?: number | null;

  /** null removes the limit. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(100_000)
  maxCustomers?: number | null;

  /** A new folder takes effect at the next sync; photos only in the old folder are then retired. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  driveFolderUrl?: string;

  /** null unlinks the booking. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  bookingId?: string | null;
}

export class CreateSessionDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  customerName: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsEmail()
  @MaxLength(200)
  customerEmail?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(30)
  customerPhone?: string;
}

export class SubmitSelectionDto {
  /** An overall message for the studio, sent together with the picks. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class SaveSelectionDto {
  @IsArray()
  @ArrayMaxSize(10_000)
  @IsString({ each: true })
  photoIds: string[];
}

/** A customer's note on one photo, or a revision request on an edited one; blank clears it. */
export class PhotoNoteDto {
  @IsString()
  @MaxLength(1000)
  note: string;
}
