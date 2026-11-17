import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { LicenceTypeService } from './licence-type.service';
import { CreateLicenceTypeDto } from './dto/create-licence-type.dto';
import { UpdateLicenceTypeDto } from './dto/update-licence-type.dto';

@Controller('licence-types')
export class LicenceTypeController {
  constructor(private readonly licenceTypeService: LicenceTypeService) {}

  @Post()
  create(@Body() dto: CreateLicenceTypeDto) {
    return this.licenceTypeService.create(dto);
  }

  @Get()
  findAll() {
    return this.licenceTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.licenceTypeService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLicenceTypeDto) {
    return this.licenceTypeService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.licenceTypeService.remove(id);
  }
}
