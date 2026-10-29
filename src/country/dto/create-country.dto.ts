import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  descriptionES: string;

  @IsString()
  @IsNotEmpty()
  descriptionPT: string;

  @IsString()
  @IsNotEmpty()
  descriptionEN: string;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  taxKey: string;

  @IsString()
  @IsNotEmpty()
  taxKeyFormat: string;
}
