import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { DeviceAvailability } from '@prisma/client';

export class CreateTypeDeviceDto {
  @IsString()
  @IsNotEmpty()
  model: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  family?: string;

  @IsOptional()
  @IsString()
  subFamily?: string;

  @IsOptional()
  @IsEnum(DeviceAvailability)
  available?: DeviceAvailability;
}
