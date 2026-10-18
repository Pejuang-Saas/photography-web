import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CRM_COLORS } from '../crm-colors';

export class CreateCrmCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string;

  @IsIn([...CRM_COLORS])
  color: string;
}

export class UpdateCrmCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsIn([...CRM_COLORS])
  color?: string;
}

/** `null` takes the category off the conversation. */
export class AssignCrmCategoryDto {
  @ValidateIf((dto: AssignCrmCategoryDto) => dto.categoryId !== null)
  @IsUUID()
  categoryId: string | null;
}
