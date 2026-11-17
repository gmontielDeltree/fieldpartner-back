import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TypeDeviceService } from './type-device.service';
import { CreateTypeDeviceDto } from './dto/create-type-device.dto';
import { UpdateTypeDeviceDto } from './dto/update-type-device.dto';

@Controller('type-devices')
export class TypeDeviceController {
  constructor(private readonly typeDeviceService: TypeDeviceService) {}

  @Post()
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
  update(@Param('id') id: string, @Body() dto: UpdateTypeDeviceDto) {
    return this.typeDeviceService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.typeDeviceService.remove(id);
  }
}
