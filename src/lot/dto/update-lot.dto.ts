import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateLotDto } from './create-lot.dto';

/** Layout and field are immutable: a lot never moves; draw a new one instead. */
export class UpdateLotDto extends PartialType(OmitType(CreateLotDto, ['layoutId', 'fieldId'] as const)) {}
