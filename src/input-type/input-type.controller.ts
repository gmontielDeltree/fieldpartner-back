import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { InputTypeService } from './input-type.service';
import { CreateInputTypeDto } from './dto/create-input-type.dto';
import { UpdateInputTypeDto } from './dto/update-input-type.dto';

@Controller('input-types')
export class InputTypeController {
  constructor(private readonly inputTypeService: InputTypeService) {}

  @Post()
  create(@Body() dto: CreateInputTypeDto) {
    return this.inputTypeService.create(dto);
  }

  @Get()
  findAll() {
    return this.inputTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inputTypeService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInputTypeDto) {
    return this.inputTypeService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inputTypeService.remove(id);
  }
}
