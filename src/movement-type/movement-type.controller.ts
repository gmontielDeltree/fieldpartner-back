import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { MovementTypeService } from './movement-type.service';
import { CreateMovementTypeDto } from './dto/create-movement-type.dto';
import { UpdateMovementTypeDto } from './dto/update-movement-type.dto';

@Controller('movement-types')
export class MovementTypeController {
  constructor(private readonly movementTypeService: MovementTypeService) {}

  @Post()
  create(@Body() dto: CreateMovementTypeDto) {
    return this.movementTypeService.create(dto);
  }

  @Get()
  findAll() {
    return this.movementTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.movementTypeService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMovementTypeDto) {
    return this.movementTypeService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.movementTypeService.remove(id);
  }
}
