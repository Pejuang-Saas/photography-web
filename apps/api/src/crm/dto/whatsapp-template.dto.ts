import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CATEGORY_VALUES, type TemplateCategory } from '../whatsapp-template-defaults';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Everything an admin edits about a template. */
export class WhatsappTemplateContentDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsIn(CATEGORY_VALUES)
  category: TemplateCategory;

  @IsString()
  @MaxLength(5000)
  body: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetWhatsappTemplateActiveDto {
  @IsBoolean()
  isActive: boolean;
}

export class TestSendTemplateDto {
  /** The draft as it stands in the editor, so a test needs no save first. */
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;

  @Transform(trim)
  @Matches(/^\+?[0-9][0-9\s-]{7,18}$/, { message: 'Nomor WhatsApp tidak valid' })
  phone: string;
}
