import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AccountCategory, AccountStatus } from '@prisma/client';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateCountersDto } from './dto/update-counters.dto';

@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.accountService.create(dto);
  }

  @Get()
  findAll(
    @Query('category') category?: AccountCategory,
    @Query('status') status?: AccountStatus,
  ) {
    return this.accountService.findAll({ category, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountService.findOne(id);
  }

  @Get(':id/limits')
  getLimits(@Param('id') id: string) {
    return this.accountService.getLimits(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountService.update(id, dto);
  }

  @Patch(':id/counters')
  updateCounters(@Param('id') id: string, @Body() dto: UpdateCountersDto) {
    return this.accountService.updateCounters(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountService.remove(id);
  }
}
