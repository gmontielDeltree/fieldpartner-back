import { Injectable, NotFoundException } from '@nestjs/common';
import { InputRepository } from './input.repository';
import { CreateInputDto } from './dto/create-input.dto';
import { UpdateInputDto } from './dto/update-input.dto';

@Injectable()
export class InputService {
  constructor(private readonly inputRepository: InputRepository) {}

  create(dto: CreateInputDto) {
    return this.inputRepository.create(dto);
  }

  findAll(accountId?: string) {
    return this.inputRepository.findAll(accountId);
  }

  findAllByAccount(accountId: string) {
    return this.inputRepository.findAllByAccount(accountId);
  }

  async findOne(id: string) {
    const input = await this.inputRepository.findOne(id);
    if (!input) throw new NotFoundException(`Input ${id} not found`);
    return input;
  }

  async update(id: string, dto: UpdateInputDto) {
    await this.findOne(id);
    return this.inputRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.inputRepository.remove(id);
  }
}
