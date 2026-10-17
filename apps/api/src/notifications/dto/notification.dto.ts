import { IsBoolean, IsEmail, IsOptional, MaxLength } from 'class-validator';

export class UpdateEmailSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSendInvoice?: boolean;
}

export class TestEmailDto {
  @IsEmail()
  @MaxLength(255)
  to: string;
}
