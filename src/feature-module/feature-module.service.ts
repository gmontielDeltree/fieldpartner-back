import { Injectable, NotFoundException } from '@nestjs/common';
import { FeatureModuleRepository } from './feature-module.repository';
import { CreateFeatureModuleDto } from './dto/create-feature-module.dto';
import { UpdateFeatureModuleDto } from './dto/update-feature-module.dto';

@Injectable()
export class FeatureModuleService {
  constructor(private readonly featureModuleRepository: FeatureModuleRepository) {}

  create(dto: CreateFeatureModuleDto) {
    return this.featureModuleRepository.create(dto);
  }

  findAll() {
    return this.featureModuleRepository.findAll();
  }

  async findOne(id: string) {
    const featureModule = await this.featureModuleRepository.findOne(id);
    if (!featureModule) throw new NotFoundException(`Module ${id} not found`);
    return featureModule;
  }

  async update(id: string, dto: UpdateFeatureModuleDto) {
    await this.findOne(id);
    return this.featureModuleRepository.update(id, dto);
  }

  // A module with menus is protected by the FK (Restrict) → P2003 → 409.
  async remove(id: string) {
    await this.findOne(id);
    return this.featureModuleRepository.remove(id);
  }
}
