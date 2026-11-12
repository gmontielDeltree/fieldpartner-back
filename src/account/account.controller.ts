import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccountCategory, AccountStatus, UserRole } from '@prisma/client';
import { Request } from 'express';
import { RolesGuard, Caller } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateCountersDto } from './dto/update-counters.dto';

// Authenticated by the global JwtAuthGuard. Account management is platform-admin
// (GENERAL_ADMIN) territory; an account ADMIN may only read its own account.
@Controller('accounts')
@UseGuards(RolesGuard)
@Roles(UserRole.GENERAL_ADMIN, UserRole.ADMIN)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @Roles(UserRole.GENERAL_ADMIN)
  create(@Body() dto: CreateAccountDto) {
    return this.accountService.create(dto);
  }

  @Get()
  @Roles(UserRole.GENERAL_ADMIN)
  findAll(
    @Query('category') category?: AccountCategory,
    @Query('status') status?: AccountStatus,
  ) {
    return this.accountService.findAll({ category, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    this.assertOwnership(id, req.caller);
    return this.accountService.findOne(id);
  }

  @Get(':id/limits')
  getLimits(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    this.assertOwnership(id, req.caller);
    return this.accountService.getLimits(id);
  }

  @Patch(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountService.update(id, dto);
  }

  @Patch(':id/counters')
  @Roles(UserRole.GENERAL_ADMIN)
  updateCounters(@Param('id') id: string, @Body() dto: UpdateCountersDto) {
    return this.accountService.updateCounters(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.GENERAL_ADMIN)
  remove(@Param('id') id: string) {
    return this.accountService.remove(id);
  }

  /** A non-platform ADMIN may only act on its own account. */
  private assertOwnership(id: string, caller: Caller): void {
    if (caller.role !== UserRole.GENERAL_ADMIN && caller.accountId !== id) {
      throw new ForbiddenException('No tenés acceso a esta cuenta');
    }
  }
}
