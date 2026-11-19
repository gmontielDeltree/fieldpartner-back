import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Channels } from '../auth/channels.decorator';
import { Channel } from '../common/enums/channel.enum';
import { MenuModuleService } from './menu-module.service';
import { CreateMenuModuleDto } from './dto/create-menu-module.dto';
import { UpdateMenuModuleDto } from './dto/update-menu-module.dto';

@UseGuards(RolesGuard)
@Controller('menu-modules')
export class MenuModuleController {
  constructor(private readonly menuModuleService: MenuModuleService) {}

  @Post()
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  create(@Body() dto: CreateMenuModuleDto) {
    return this.menuModuleService.create(dto);
  }

  @Get()
  findAll() {
    return this.menuModuleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.menuModuleService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMenuModuleDto) {
    return this.menuModuleService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.menuModuleService.remove(id);
  }
}
