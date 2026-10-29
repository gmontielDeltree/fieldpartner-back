import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ZoneService } from './zone.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Controller('zones')
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}

  @Post()
  create(@Body() dto: CreateZoneDto) {
    return this.zoneService.create(dto);
  }

  @Get()
  findAll(@Query('accountId') accountId: string) {
    return this.zoneService.findAll(accountId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.zoneService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateZoneDto) {
    return this.zoneService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.zoneService.remove(id);
  }
}
