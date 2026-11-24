import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Caller, RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ACCOUNT_DATA_ROLES } from '../auth/account-scope';
import { AccountScopeQueryDto } from '../common/dto/account-scope-query.dto';
import { DepositService } from './deposit.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { UpdateDepositDto } from './dto/update-deposit.dto';

// Per-account data: RolesGuard resolves req.caller; the service scopes every query to it.
@Controller('deposits')
@UseGuards(RolesGuard)
@Roles(...ACCOUNT_DATA_ROLES)
export class DepositController {
  constructor(private readonly depositService: DepositService) {}

  @Post()
  create(
    @Body() dto: CreateDepositDto,
    @Query() query: AccountScopeQueryDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.depositService.create(dto, req.caller, query.accountId);
  }

  @Get()
  findAll(@Query() query: AccountScopeQueryDto, @Req() req: Request & { caller: Caller }) {
    return this.depositService.findAll(req.caller, query.accountId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    return this.depositService.findOne(id, req.caller);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDepositDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.depositService.update(id, dto, req.caller);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    return this.depositService.remove(id, req.caller);
  }
}
