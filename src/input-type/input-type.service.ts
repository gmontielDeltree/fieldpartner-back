import { Injectable, NotFoundException } from '@nestjs/common';
import { InputTypeRepository } from './input-type.repository';
import { CreateInputTypeDto } from './dto/create-input-type.dto';
import { UpdateInputTypeDto } from './dto/update-input-type.dto';

@Injectable()
export class InputTypeService {
  constructor(private readonly inputTypeRepository: InputTypeRepository) {}

  create(dto: CreateInputTypeDto) {
    return this.inputTypeRepository.create(dto);
  }

  findAll() {
    return this.inputTypeRepository.findAll();
  }

  async findOne(id: number) {
    const inputType = await this.inputTypeRepository.findOne(id);
    if (!inputType) throw new NotFoundException(`InputType ${id} not found`);
    return inputType;
  }

  async update(id: number, dto: UpdateInputTypeDto) {
    await this.findOne(id);
    return this.inputTypeRepository.update(id, dto);
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.inputTypeRepository.remove(id);
  }
}
