import { PartialType } from '@nestjs/mapped-types';
import { CreateLicenceTypeDto } from './create-licence-type.dto';
export class UpdateLicenceTypeDto extends PartialType(CreateLicenceTypeDto) {}
