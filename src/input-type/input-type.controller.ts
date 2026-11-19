import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Channels } from '../auth/channels.decorator';
import { Channel } from '../common/enums/channel.enum';
import { InputTypeService } from './input-type.service';
import { CreateInputTypeDto } from './dto/create-input-type.dto';
import { UpdateInputTypeDto } from './dto/update-input-type.dto';

@UseGuards(RolesGuard)
@Controller('input-types')
export class InputTypeController {
  constructor(private readonly inputTypeService: InputTypeService) {}

  @Post()
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
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
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInputTypeDto) {
    return this.inputTypeService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inputTypeService.remove(id);
  }
}
