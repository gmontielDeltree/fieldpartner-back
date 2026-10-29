import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  idCategory: string;

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
