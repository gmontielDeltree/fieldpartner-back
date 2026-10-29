import { Injectable, NotFoundException } from '@nestjs/common';
import { MovementTypeRepository } from './movement-type.repository';
import { CreateMovementTypeDto } from './dto/create-movement-type.dto';
import { UpdateMovementTypeDto } from './dto/update-movement-type.dto';

@Injectable()
export class MovementTypeService {
  constructor(private readonly movementTypeRepository: MovementTypeRepository) {}

  create(dto: CreateMovementTypeDto) {
    return this.movementTypeRepository.create(dto);
  }

  findAll() {
    return this.movementTypeRepository.findAll();
  }

  async findOne(id: string) {
    const movementType = await this.movementTypeRepository.findOne(id);
    if (!movementType) throw new NotFoundException(`MovementType ${id} not found`);
    return movementType;
  }

  async update(id: string, dto: UpdateMovementTypeDto) {
    await this.findOne(id);
    return this.movementTypeRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.movementTypeRepository.remove(id);
  }
}
