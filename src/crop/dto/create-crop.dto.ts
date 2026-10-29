import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsArray } from 'class-validator';
import { CropType, Labor } from '@prisma/client';

export class CreateCropDto {
  @IsString()
  @IsNotEmpty()
  descriptionES: string;

  @IsOptional()
  @IsString()
  descriptionPT?: string;

  @IsOptional()
  @IsString()
  descriptionEN?: string;

  @IsEnum(CropType)
  cropType: CropType;

  @IsOptional()
  @IsString()
  variety?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(Labor, { each: true })
  labors?: Labor[];

  @IsOptional()
  @IsBoolean()
  prepared?: boolean;

  @IsOptional()
  @IsBoolean()
  sowing?: boolean;

  @IsOptional()
  @IsBoolean()
  application?: boolean;

  @IsOptional()
  @IsBoolean()
  germination?: boolean;

  @IsOptional()
  @IsBoolean()
  harvest?: boolean;
}
