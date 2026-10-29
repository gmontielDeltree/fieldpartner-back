import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateFieldLotDto {
  @IsString()
  @IsNotEmpty()
  fieldId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  uuid?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hectares?: number;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  coordinates?: any;

  @IsOptional()
  @IsString()
  lotType?: string;
}
