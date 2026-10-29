import { PartialType } from '@nestjs/mapped-types';
import { CreateFieldLotDto } from './create-field-lot.dto';
export class UpdateFieldLotDto extends PartialType(CreateFieldLotDto) {}
