import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Caller, RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ACCOUNT_DATA_ROLES } from '../auth/account-scope';
import { AccountScopeQueryDto } from '../common/dto/account-scope-query.dto';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ListCampaignsQueryDto } from './dto/list-campaigns-query.dto';

// Per-account data: RolesGuard resolves req.caller; the service scopes every query to it.
@Controller('campaigns')
@UseGuards(RolesGuard)
@Roles(...ACCOUNT_DATA_ROLES)
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  create(
    @Body() dto: CreateCampaignDto,
    @Query() query: AccountScopeQueryDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.campaignService.create(dto, req.caller, query.accountId);
  }

  @Get()
  findAll(@Query() query: ListCampaignsQueryDto, @Req() req: Request & { caller: Caller }) {
    return this.campaignService.findAll(req.caller, query.accountId, query.state);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    return this.campaignService.findOne(id, req.caller);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @Req() req: Request & { caller: Caller },
  ) {
    return this.campaignService.update(id, dto, req.caller);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request & { caller: Caller }) {
    return this.campaignService.remove(id, req.caller);
  }
}
