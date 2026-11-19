import { PartialType } from '@nestjs/mapped-types';
import { CreateFeatureModuleDto } from './create-feature-module.dto';

export class UpdateFeatureModuleDto extends PartialType(CreateFeatureModuleDto) {}
