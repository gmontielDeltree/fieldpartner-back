import { Injectable, NotFoundException } from '@nestjs/common';
import { SystemRepository } from './system.repository';
import { CreateSystemDto } from './dto/create-system.dto';
import { UpdateSystemDto } from './dto/update-system.dto';

@Injectable()
export class SystemService {
  constructor(private readonly systemRepository: SystemRepository) {}

  create(dto: CreateSystemDto) {
    return this.systemRepository.create(dto);
  }

  findAll() {
    return this.systemRepository.findAll();
  }

  async findOne(id: string) {
    const system = await this.systemRepository.findOne(id);
    if (!system) throw new NotFoundException(`System ${id} not found`);
    return system;
  }

  async update(id: string, dto: UpdateSystemDto) {
    await this.findOne(id);
    return this.systemRepository.update(id, dto);
  }

  // Referenced by licence types or menus → the FK (Restrict) rejects the delete with P2003,
  // which the GlobalExceptionFilter turns into a 409. Nothing is deleted in cascade.
  async remove(id: string) {
    await this.findOne(id);
    return this.systemRepository.remove(id);
  }
}
