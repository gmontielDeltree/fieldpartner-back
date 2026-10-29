import { PartialType } from '@nestjs/mapped-types';
import { CreateInputTypeDto } from './create-input-type.dto';
export class UpdateInputTypeDto extends PartialType(CreateInputTypeDto) {}
