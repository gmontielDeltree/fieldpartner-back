import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MovementTypeService } from './movement-type.service';
import { CreateMovementTypeDto } from './dto/create-movement-type.dto';
import { UpdateMovementTypeDto } from './dto/update-movement-type.dto';

@UseGuards(RolesGuard)
@Controller('movement-types')
export class MovementTypeController {
  constructor(private readonly movementTypeService: MovementTypeService) {}

  @Post()
  @Roles(UserRole.GENERAL_ADMIN)
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
  @Roles(UserRole.GENERAL_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateMovementTypeDto) {
    return this.movementTypeService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  remove(@Param('id') id: string) {
    return this.movementTypeService.remove(id);
  }
}
