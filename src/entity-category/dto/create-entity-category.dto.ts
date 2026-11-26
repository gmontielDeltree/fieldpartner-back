import { IsString, IsNotEmpty } from 'class-validator';

export class CreateEntityCategoryDto {
  /** Stable key the apps rely on, e.g. CONTRACTOR (CouchDB `idCategory`). */
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
}
