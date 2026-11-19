import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Channels } from '../auth/channels.decorator';
import { Channel } from '../common/enums/channel.enum';
import { CountryService } from './country.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@UseGuards(RolesGuard)
@Controller('countries')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Post()
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  create(@Body() dto: CreateCountryDto) {
    return this.countryService.create(dto);
  }

  @Get()
  findAll() {
    return this.countryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.countryService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  update(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.countryService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  @Channels(Channel.Backoffice)
  remove(@Param('id') id: string) {
    return this.countryService.remove(id);
  }
}
