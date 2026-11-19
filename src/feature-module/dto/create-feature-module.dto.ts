import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateFeatureModuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameEs: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  namePt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
