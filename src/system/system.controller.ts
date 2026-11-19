import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Channels } from '../auth/channels.decorator';
import { Channel } from '../common/enums/channel.enum';
import { SystemService } from './system.service';
import { CreateSystemDto } from './dto/create-system.dto';
import { UpdateSystemDto } from './dto/update-system.dto';

@UseGuards(RolesGuard)
@Controller('systems')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Post()
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  create(@Body() dto: CreateSystemDto) {
    return this.systemService.create(dto);
  }

  @Get()
  findAll() {
    return this.systemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.systemService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSystemDto) {
    return this.systemService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.systemService.remove(id);
  }
}
