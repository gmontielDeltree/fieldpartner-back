import { Injectable, NotFoundException } from '@nestjs/common';
import { Caller } from '../auth/roles.guard';
import { accountFilter, resolveTargetAccount } from '../auth/account-scope';
import { LotLayoutRepository } from './lot-layout.repository';
import { LotLayoutBusiness } from './businessLogic/lot-layout.business';
import { CreateLotLayoutDto } from './dto/create-lot-layout.dto';
import { UpdateLotLayoutDto } from './dto/update-lot-layout.dto';
import { LotLayoutDto } from './dto/lot-layout.dto';

/** Lot layouts belong to one account: every operation is scoped to the caller. */
@Injectable()
export class LotLayoutService {
  constructor(
    private readonly layoutRepository: LotLayoutRepository,
    private readonly layoutBusiness: LotLayoutBusiness,
  ) {}

  create(dto: CreateLotLayoutDto, caller: Caller, accountId?: string): Promise<LotLayoutDto> {
    return this.layoutBusiness.create(resolveTargetAccount(caller, accountId), dto);
  }

  findAll(caller: Caller, accountId?: string): Promise<LotLayoutDto[]> {
    return this.layoutRepository.findAll(resolveTargetAccount(caller, accountId));
  }

  /** 404 both when it does not exist and when it belongs to another account. */
  async findOne(id: string, caller: Caller): Promise<LotLayoutDto> {
    const layout = await this.layoutRepository.findOne(id, accountFilter(caller));
    if (!layout) throw new NotFoundException(`Lot layout ${id} not found`);
    return layout;
  }

  async update(id: string, dto: UpdateLotLayoutDto, caller: Caller): Promise<LotLayoutDto> {
    await this.findOne(id, caller);
    return this.layoutRepository.rename(id, dto.name);
  }

  /** Marks the layout as the base for the next campaigns ("promote" in the front). */
  async promote(id: string, caller: Caller): Promise<LotLayoutDto> {
    await this.findOne(id, caller);
    return this.layoutRepository.promote(id);
  }

  async remove(id: string, caller: Caller): Promise<LotLayoutDto> {
    return this.layoutBusiness.remove(await this.findOne(id, caller));
  }
}
