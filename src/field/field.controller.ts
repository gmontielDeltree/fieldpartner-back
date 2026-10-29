import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { FieldService } from './field.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';

@Controller('fields')
export class FieldController {
  constructor(private readonly fieldService: FieldService) {}

  @Post()
  create(@Body() dto: CreateFieldDto) {
    return this.fieldService.create(dto);
  }

  @Get()
  findAll(@Query('accountId') accountId: string) {
    return this.fieldService.findAll(accountId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fieldService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFieldDto) {
    return this.fieldService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fieldService.remove(id);
  }
}
