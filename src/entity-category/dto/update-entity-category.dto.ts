import { PartialType } from '@nestjs/mapped-types';
import { CreateEntityCategoryDto } from './create-entity-category.dto';
export class UpdateEntityCategoryDto extends PartialType(CreateEntityCategoryDto) {}
