import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateMenuModuleDto } from './create-menu-module.dto';

/** Everything but the id, which is immutable (permissions reference it). */
export class UpdateMenuModuleDto extends PartialType(OmitType(CreateMenuModuleDto, ['id'] as const)) {}
