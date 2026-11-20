import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Caller, RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ACCOUNT_DATA_ROLES } from '../auth/account-scope';
import { AccountScopeQueryDto } from '../common/dto/account-scope-query.dto';
import { InputService } from './input.service';
import { CreateInputDto } from './dto/create-input.dto';
import { UpdateInputDto } from './dto/update-input.dto';

// Per-account data plus the platform catalog (accountId null). RolesGuard resolves
// req.caller; the service and InputBusiness scope every operation to it.
@Controller('inputs')
@UseGuards(RolesGuard)
@Roles(...ACCOUNT_DATA_ROLES)
export class InputController {
  constructor(private readonly inputService: InputService) {}

  @Post()
  create(
    @Body() dto: CreateInputDto,
    @Query() query: AccountScopeQueryDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.inputService.create(dto, req.caller, query.accountId);
  }

  @Get()
  findAll(@Query() query: AccountScopeQueryDto, @Req() req: Request & { caller: Caller }) {
    return this.inputService.findAll(req.caller, query.accountId);
  }

  @Get('by-account/:accountId')
  findAllByAccount(@Param('accountId') accountId: string, @Req() req: Request & { caller: Caller }) {
    return this.inputService.findAllByAccount(req.caller, accountId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    return this.inputService.findOne(id, req.caller);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInputDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.inputService.update(id, dto, req.caller);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    return this.inputService.remove(id, req.caller);
  }
}
