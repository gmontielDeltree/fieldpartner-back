import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateInputTypeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  descriptionES: string;

  @IsString()
  @IsNotEmpty()
  descriptionEN: string;

  @IsString()
  @IsNotEmpty()
  descriptionPT: string;

  @IsOptional()
  @IsBoolean()
  phytosanitary?: boolean;

  @IsOptional()
  @IsBoolean()
  isCrop?: boolean;
}
