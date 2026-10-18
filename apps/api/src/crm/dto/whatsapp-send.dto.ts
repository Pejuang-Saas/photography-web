import { Transform } from 'class-transformer';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text: string;
}

export class SendTemplateDto {
  @IsUUID()
  templateId: string;
}

export class OpenChatDto {
  @IsUUID()
  bookingId: string;
}
