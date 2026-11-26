import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityCategoryRepository } from './entity-category.repository';
import { CreateEntityCategoryDto } from './dto/create-entity-category.dto';
import { UpdateEntityCategoryDto } from './dto/update-entity-category.dto';

@Injectable()
export class EntityCategoryService {
  constructor(private readonly entityCategoryRepository: EntityCategoryRepository) {}

  create(dto: CreateEntityCategoryDto) {
    return this.entityCategoryRepository.create(dto);
  }

  findAll() {
    return this.entityCategoryRepository.findAll();
  }

  async findOne(id: string) {
    const entityCategory = await this.entityCategoryRepository.findOne(id);
    if (!entityCategory) throw new NotFoundException(`Entity category ${id} not found`);
    return entityCategory;
  }

  async update(id: string, dto: UpdateEntityCategoryDto) {
    await this.findOne(id);
    return this.entityCategoryRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.entityCategoryRepository.remove(id);
  }
}
