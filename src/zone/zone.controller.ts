import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Caller, RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ACCOUNT_DATA_ROLES } from '../auth/account-scope';
import { AccountScopeQueryDto } from '../common/dto/account-scope-query.dto';
import { ZoneService } from './zone.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

// Per-account data: RolesGuard resolves req.caller; the service scopes every query to it.
@Controller('zones')
@UseGuards(RolesGuard)
@Roles(...ACCOUNT_DATA_ROLES)
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}

  @Post()
  create(
    @Body() dto: CreateZoneDto,
    @Query() query: AccountScopeQueryDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.zoneService.create(dto, req.caller, query.accountId);
  }

  @Get()
  findAll(@Query() query: AccountScopeQueryDto, @Req() req: Request & { caller: Caller }) {
    return this.zoneService.findAll(req.caller, query.accountId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    return this.zoneService.findOne(id, req.caller);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateZoneDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.zoneService.update(id, dto, req.caller);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    return this.zoneService.remove(id, req.caller);
  }
}
