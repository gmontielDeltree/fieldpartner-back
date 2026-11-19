import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSystemDto {
  /** Admin-chosen identifier, unique (CouchDB "id"). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  technicalDetails?: string;
}
