import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class SeoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(70)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  keywords: string[];
}

class HeroDto {
  @IsString() @MaxLength(120) badge: string;
  @IsString() @MinLength(1) @MaxLength(80) headlineLine1: string;
  @IsString() @MaxLength(80) headlineLine2: string;
  @IsString() @MaxLength(80) headlineLine3: string;
  @IsString() @MaxLength(300) subtitle: string;
  @IsString() @MinLength(1) @MaxLength(40) primaryCta: string;
  @IsString() @MinLength(1) @MaxLength(40) secondaryCta: string;
}

class SectionIntroDto {
  @IsString() @MinLength(1) @MaxLength(120) heading: string;
  @IsString() @MaxLength(400) description: string;
}

class PointDto {
  @IsString() @MinLength(1) @MaxLength(100) title: string;
  @IsString() @MaxLength(300) description: string;
}

class AboutDto {
  @IsString() @MinLength(1) @MaxLength(160) heading: string;
  @IsString() @MaxLength(200) subheading: string;
  @IsString() @MaxLength(600) body: string;

  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  points: PointDto[];
}

export class UpdateLandingContentDto {
  @ValidateNested() @Type(() => SeoDto) seo: SeoDto;
  @ValidateNested() @Type(() => HeroDto) hero: HeroDto;
  @ValidateNested() @Type(() => SectionIntroDto) portfolio: SectionIntroDto;
  @ValidateNested() @Type(() => AboutDto) about: AboutDto;
  @ValidateNested() @Type(() => SectionIntroDto) packages: SectionIntroDto;

  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  steps: PointDto[];
}
