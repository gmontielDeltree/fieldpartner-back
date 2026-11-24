import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Caller, RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ACCOUNT_DATA_ROLES } from '../auth/account-scope';
import { LotService } from './lot.service';
import { CreateLotDto } from './dto/create-lot.dto';
import { UpdateLotDto } from './dto/update-lot.dto';
import { LotQueryDto, LotWriteQueryDto } from './dto/lot-query.dto';

// Per-account data: RolesGuard resolves req.caller; the service scopes through the layout.
@Controller('lots')
@UseGuards(RolesGuard)
@Roles(...ACCOUNT_DATA_ROLES)
export class LotController {
  constructor(private readonly lotService: LotService) {}

  @Post()
  create(
    @Body() dto: CreateLotDto,
    @Query() query: LotWriteQueryDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.lotService.create(dto, req.caller, query.campaignId);
  }

  @Get()
  findAll(@Query() query: LotQueryDto, @Req() req: Request & { caller: Caller }) {
    return this.lotService.findAll(query, req.caller);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    return this.lotService.findOne(id, req.caller);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLotDto,
    @Query() query: LotWriteQueryDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.lotService.update(id, dto, req.caller, query.campaignId);
  }

  /** Archives when the lot is referenced, deletes otherwise. */
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query() query: LotWriteQueryDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.lotService.remove(id, req.caller, query.campaignId);
  }
}
