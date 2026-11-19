import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Channels } from '../auth/channels.decorator';
import { Channel } from '../common/enums/channel.enum';
import { FeatureModuleService } from './feature-module.service';
import { CreateFeatureModuleDto } from './dto/create-feature-module.dto';
import { UpdateFeatureModuleDto } from './dto/update-feature-module.dto';

@UseGuards(RolesGuard)
@Controller('modules')
export class FeatureModuleController {
  constructor(private readonly featureModuleService: FeatureModuleService) {}

  @Post()
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  create(@Body() dto: CreateFeatureModuleDto) {
    return this.featureModuleService.create(dto);
  }

  @Get()
  findAll() {
    return this.featureModuleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.featureModuleService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFeatureModuleDto) {
    return this.featureModuleService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.featureModuleService.remove(id);
  }
}
