import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Channels } from '../auth/channels.decorator';
import { Channel } from '../common/enums/channel.enum';
import { LicenceTypeService } from './licence-type.service';
import { CreateLicenceTypeDto } from './dto/create-licence-type.dto';
import { UpdateLicenceTypeDto } from './dto/update-licence-type.dto';

@UseGuards(RolesGuard)
@Controller('licence-types')
export class LicenceTypeController {
  constructor(private readonly licenceTypeService: LicenceTypeService) {}

  @Post()
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  create(@Body() dto: CreateLicenceTypeDto) {
    return this.licenceTypeService.create(dto);
  }

  @Get()
  findAll() {
    return this.licenceTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.licenceTypeService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  update(@Param('id') id: string, @Body() dto: UpdateLicenceTypeDto) {
    return this.licenceTypeService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  remove(@Param('id') id: string) {
    return this.licenceTypeService.remove(id);
  }
}
