import { Controller, Get, Param } from '@nestjs/common';
import { LicenceTypeService } from './licence-type.service';

@Controller('licence-types')
export class LicenceTypeController {
  constructor(private readonly licenceTypeService: LicenceTypeService) {}

  @Get()
  findAll() {
    return this.licenceTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.licenceTypeService.findOne(id);
  }
}
