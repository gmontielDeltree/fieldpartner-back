import { Injectable, NotFoundException } from '@nestjs/common';
import { Caller } from '../auth/roles.guard';
import { accountFilter, resolveTargetAccount } from '../auth/account-scope';
import { ZoneRepository } from './zone.repository';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ZoneDto } from './dto/zone.dto';

/** Zones belong to one account: every operation is scoped to the caller (see account-scope). */
@Injectable()
export class ZoneService {
  constructor(private readonly zoneRepository: ZoneRepository) {}

  create(dto: CreateZoneDto, caller: Caller, accountId?: string): Promise<ZoneDto> {
    return this.zoneRepository.create(resolveTargetAccount(caller, accountId), dto);
  }

  findAll(caller: Caller, accountId?: string): Promise<ZoneDto[]> {
    return this.zoneRepository.findAll(resolveTargetAccount(caller, accountId));
  }

  /** 404 both when it does not exist and when it belongs to another account. */
  async findOne(id: string, caller: Caller): Promise<ZoneDto> {
    const zone = await this.zoneRepository.findOne(id, accountFilter(caller));
    if (!zone) throw new NotFoundException(`Zone ${id} not found`);
    return zone;
  }

  async update(id: string, dto: UpdateZoneDto, caller: Caller): Promise<ZoneDto> {
    await this.findOne(id, caller);
    return this.zoneRepository.update(id, dto);
  }

  async remove(id: string, caller: Caller): Promise<ZoneDto> {
    await this.findOne(id, caller);
    return this.zoneRepository.remove(id);
  }
}
