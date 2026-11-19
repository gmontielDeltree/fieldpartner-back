import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TypeDeviceService } from './type-device.service';
import { CreateTypeDeviceDto } from './dto/create-type-device.dto';
import { UpdateTypeDeviceDto } from './dto/update-type-device.dto';

@UseGuards(RolesGuard)
@Controller('type-devices')
export class TypeDeviceController {
  constructor(private readonly typeDeviceService: TypeDeviceService) {}

  @Post()
  @Roles(UserRole.GENERAL_ADMIN)
  create(@Body() dto: CreateTypeDeviceDto) {
    return this.typeDeviceService.create(dto);
  }

  @Get()
  findAll() {
    return this.typeDeviceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.typeDeviceService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTypeDeviceDto) {
    return this.typeDeviceService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  remove(@Param('id') id: string) {
    return this.typeDeviceService.remove(id);
  }
}
