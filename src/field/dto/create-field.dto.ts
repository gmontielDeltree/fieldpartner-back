import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateFieldDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsOptional()
  @IsString()
  countryId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  uuid?: string;

  @IsOptional()
  geojson?: any;
}
