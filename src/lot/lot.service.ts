import { Injectable, NotFoundException } from '@nestjs/common';
import { Caller } from '../auth/roles.guard';
import { accountFilter } from '../auth/account-scope';
import { LotLayoutRepository } from '../lot-layout/lot-layout.repository';
import { LotLayoutDto } from '../lot-layout/dto/lot-layout.dto';
import { LotRepository } from './lot.repository';
import { LotBusiness } from './businessLogic/lot.business';
import { CreateLotDto } from './dto/create-lot.dto';
import { UpdateLotDto } from './dto/update-lot.dto';
import { LotDto, LotMutationDto } from './dto/lot.dto';
import { LotQueryDto } from './dto/lot-query.dto';

/**
 * Lots are scoped through their layout's account: a layout or lot of another account is a
 * 404, exactly like any other per-account record (see account-scope).
 */
@Injectable()
export class LotService {
  constructor(
    private readonly lotRepository: LotRepository,
    private readonly layoutRepository: LotLayoutRepository,
    private readonly lotBusiness: LotBusiness,
  ) {}

  async findAll(query: LotQueryDto, caller: Caller): Promise<LotDto[]> {
    await this.findLayout(query.layoutId, caller);
    return this.lotRepository.findAll(query.layoutId, query.fieldId, query.includeArchived === 'true');
  }

  async findOne(id: string, caller: Caller): Promise<LotDto> {
    const lot = await this.lotRepository.findOne(id, accountFilter(caller));
    if (!lot) throw new NotFoundException(`Lot ${id} not found`);
    return lot;
  }

  async create(dto: CreateLotDto, caller: Caller, campaignId?: string): Promise<LotMutationDto> {
    const layout = await this.findLayout(dto.layoutId, caller);
    return this.lotBusiness.create(layout.accountId, dto, campaignId);
  }

  async update(id: string, dto: UpdateLotDto, caller: Caller, campaignId?: string): Promise<LotMutationDto> {
    return this.lotBusiness.update(await this.findOne(id, caller), dto, campaignId);
  }

  async remove(id: string, caller: Caller, campaignId?: string): Promise<LotMutationDto> {
    return this.lotBusiness.remove(await this.findOne(id, caller), campaignId);
  }

  private async findLayout(id: string, caller: Caller): Promise<LotLayoutDto> {
    const layout = await this.layoutRepository.findOne(id, accountFilter(caller));
    if (!layout) throw new NotFoundException(`Lot layout ${id} not found`);
    return layout;
  }
}
