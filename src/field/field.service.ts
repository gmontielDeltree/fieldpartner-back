import { Injectable, NotFoundException } from '@nestjs/common';
import { FieldRepository } from './field.repository';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';

@Injectable()
export class FieldService {
  constructor(private readonly fieldRepository: FieldRepository) {}

  create(dto: CreateFieldDto) {
    return this.fieldRepository.create(dto);
  }

  findAll(accountId: string) {
    return this.fieldRepository.findAll(accountId);
  }

  async findOne(id: string) {
    const field = await this.fieldRepository.findOne(id);
    if (!field) throw new NotFoundException(`Field ${id} not found`);
    return field;
  }

  async update(id: string, dto: UpdateFieldDto) {
    await this.findOne(id);
    return this.fieldRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.fieldRepository.remove(id);
  }
}
