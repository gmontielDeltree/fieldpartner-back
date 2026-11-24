import { PartialType } from '@nestjs/mapped-types';
import { CreateFieldDto } from './create-field.dto';

/** A new `geometry` is checked against the lots of open layouts (see FieldBusiness.update). */
export class UpdateFieldDto extends PartialType(CreateFieldDto) {}
