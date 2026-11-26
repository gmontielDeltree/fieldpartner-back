import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateEntityCategoryDto } from './create-entity-category.dto';

/** Everything but the code, which is immutable (the apps look categories up by it). */
export class UpdateEntityCategoryDto extends PartialType(OmitType(CreateEntityCategoryDto, ['code'] as const)) {}
