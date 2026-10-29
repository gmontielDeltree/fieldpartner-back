import { Injectable, NotFoundException } from '@nestjs/common';
import { FieldLotRepository } from './field-lot.repository';
import { CreateFieldLotDto } from './dto/create-field-lot.dto';
import { UpdateFieldLotDto } from './dto/update-field-lot.dto';

@Injectable()
export class FieldLotService {
  constructor(private readonly fieldLotRepository: FieldLotRepository) {}

  create(dto: CreateFieldLotDto) {
    return this.fieldLotRepository.create(dto);
  }

  findAll(fieldId: string) {
    return this.fieldLotRepository.findAll(fieldId);
  }

  async findOne(id: string) {
    const fieldLot = await this.fieldLotRepository.findOne(id);
    if (!fieldLot) throw new NotFoundException(`FieldLot ${id} not found`);
    return fieldLot;
  }

  async update(id: string, dto: UpdateFieldLotDto) {
    await this.findOne(id);
    return this.fieldLotRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.fieldLotRepository.remove(id);
  }
}
