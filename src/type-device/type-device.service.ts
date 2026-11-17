import { Injectable, NotFoundException } from '@nestjs/common';
import { TypeDeviceRepository } from './type-device.repository';
import { CreateTypeDeviceDto } from './dto/create-type-device.dto';
import { UpdateTypeDeviceDto } from './dto/update-type-device.dto';

@Injectable()
export class TypeDeviceService {
  constructor(private readonly typeDeviceRepository: TypeDeviceRepository) {}

  create(dto: CreateTypeDeviceDto) {
    return this.typeDeviceRepository.create(dto);
  }

  findAll() {
    return this.typeDeviceRepository.findAll();
  }

  async findOne(id: string) {
    const typeDevice = await this.typeDeviceRepository.findOne(id);
    if (!typeDevice) throw new NotFoundException(`TypeDevice ${id} not found`);
    return typeDevice;
  }

  async update(id: string, dto: UpdateTypeDeviceDto) {
    await this.findOne(id);
    return this.typeDeviceRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.typeDeviceRepository.remove(id);
  }
}
