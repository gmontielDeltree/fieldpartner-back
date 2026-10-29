import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { FieldLotService } from './field-lot.service';
import { CreateFieldLotDto } from './dto/create-field-lot.dto';
import { UpdateFieldLotDto } from './dto/update-field-lot.dto';

@Controller('field-lots')
export class FieldLotController {
  constructor(private readonly fieldLotService: FieldLotService) {}

  @Post()
  create(@Body() dto: CreateFieldLotDto) {
    return this.fieldLotService.create(dto);
  }

  @Get()
  findAll(@Query('fieldId') fieldId: string) {
    return this.fieldLotService.findAll(fieldId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fieldLotService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFieldLotDto) {
    return this.fieldLotService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fieldLotService.remove(id);
  }
}
