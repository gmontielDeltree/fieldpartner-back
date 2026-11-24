import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Caller, RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ACCOUNT_DATA_ROLES } from '../auth/account-scope';
import { AccountScopeQueryDto } from '../common/dto/account-scope-query.dto';
import { FieldService } from './field.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { FieldQueryDto } from './dto/field-query.dto';

// Per-account data: RolesGuard resolves req.caller; the service scopes every query to it.
@Controller('fields')
@UseGuards(RolesGuard)
@Roles(...ACCOUNT_DATA_ROLES)
export class FieldController {
  constructor(private readonly fieldService: FieldService) {}

  @Post()
  create(
    @Body() dto: CreateFieldDto,
    @Query() query: AccountScopeQueryDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.fieldService.create(dto, req.caller, query.accountId);
  }

  @Get()
  findAll(@Query() query: FieldQueryDto, @Req() req: Request & { caller: Caller }) {
    return this.fieldService.findAll(req.caller, query.accountId, query.includeArchived === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    return this.fieldService.findOne(id, req.caller);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFieldDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.fieldService.update(id, dto, req.caller);
  }

  /** Archives when the field is referenced (lots, stock, exits…), deletes otherwise. */
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    return this.fieldService.remove(id, req.caller);
  }
}
