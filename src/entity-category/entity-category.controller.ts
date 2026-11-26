import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Channels } from '../auth/channels.decorator';
import { Channel } from '../common/enums/channel.enum';
import { EntityCategoryService } from './entity-category.service';
import { CreateEntityCategoryDto } from './dto/create-entity-category.dto';
import { UpdateEntityCategoryDto } from './dto/update-entity-category.dto';

@UseGuards(RolesGuard)
@Controller('entity-categories')
export class EntityCategoryController {
  constructor(private readonly entityCategoryService: EntityCategoryService) {}

  @Post()
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  create(@Body() dto: CreateEntityCategoryDto) {
    return this.entityCategoryService.create(dto);
  }

  @Get()
  findAll() {
    return this.entityCategoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.entityCategoryService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  update(@Param('id') id: string, @Body() dto: UpdateEntityCategoryDto) {
    return this.entityCategoryService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  remove(@Param('id') id: string) {
    return this.entityCategoryService.remove(id);
  }
}
