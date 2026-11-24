import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Caller, RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ACCOUNT_DATA_ROLES } from '../auth/account-scope';
import { AccountScopeQueryDto } from '../common/dto/account-scope-query.dto';
import { LotLayoutService } from './lot-layout.service';
import { CreateLotLayoutDto } from './dto/create-lot-layout.dto';
import { UpdateLotLayoutDto } from './dto/update-lot-layout.dto';

// Per-account data: RolesGuard resolves req.caller; the service scopes every query to it.
@Controller('lot-layouts')
@UseGuards(RolesGuard)
@Roles(...ACCOUNT_DATA_ROLES)
export class LotLayoutController {
  constructor(private readonly layoutService: LotLayoutService) {}

  @Post()
  create(
    @Body() dto: CreateLotLayoutDto,
    @Query() query: AccountScopeQueryDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.layoutService.create(dto, req.caller, query.accountId);
  }

  @Get()
  findAll(@Query() query: AccountScopeQueryDto, @Req() req: Request & { caller: Caller }) {
    return this.layoutService.findAll(req.caller, query.accountId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    return this.layoutService.findOne(id, req.caller);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLotLayoutDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.layoutService.update(id, dto, req.caller);
  }

  @Post(':id/promote')
  promote(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    return this.layoutService.promote(id, req.caller);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    return this.layoutService.remove(id, req.caller);
  }
}
