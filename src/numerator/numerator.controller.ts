import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Caller, RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ACCOUNT_DATA_ROLES } from '../auth/account-scope';
import { AccountScopeQueryDto } from '../common/dto/account-scope-query.dto';
import { NumeratorService } from './numerator.service';
import { NumeratorTypeParamDto } from './dto/numerator.dto';

// Per-account data: RolesGuard resolves req.caller; the service scopes every query to it.
@Controller('numerators')
@UseGuards(RolesGuard)
@Roles(...ACCOUNT_DATA_ROLES)
export class NumeratorController {
  constructor(private readonly numeratorService: NumeratorService) {}

  @Get()
  findAll(@Query() query: AccountScopeQueryDto, @Req() req: Request & { caller: Caller }) {
    return this.numeratorService.findAll(req.caller, query.accountId);
  }

  @Get(':type/peek')
  peek(
    @Param() params: NumeratorTypeParamDto,
    @Query() query: AccountScopeQueryDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.numeratorService.peek(params.type, req.caller, query.accountId);
  }

  @Post(':type/take')
  @HttpCode(HttpStatus.OK)
  take(
    @Param() params: NumeratorTypeParamDto,
    @Query() query: AccountScopeQueryDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.numeratorService.take(params.type, req.caller, query.accountId);
  }
}
