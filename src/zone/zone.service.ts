import { Injectable, NotFoundException } from '@nestjs/common';
import { ZoneRepository } from './zone.repository';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Injectable()
export class ZoneService {
  constructor(private readonly zoneRepository: ZoneRepository) {}

  create(dto: CreateZoneDto) {
    return this.zoneRepository.create(dto);
  }

  findAll(accountId: string) {
    return this.zoneRepository.findAll(accountId);
  }

  async findOne(id: string) {
    const zone = await this.zoneRepository.findOne(id);
    if (!zone) throw new NotFoundException(`Zone ${id} not found`);
    return zone;
  }

  async update(id: string, dto: UpdateZoneDto) {
    await this.findOne(id);
    return this.zoneRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.zoneRepository.remove(id);
  }
}
