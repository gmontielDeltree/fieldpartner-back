import { Injectable, NotFoundException } from '@nestjs/common';
import { LicenceTypeRepository } from './licence-type.repository';

@Injectable()
export class LicenceTypeService {
  constructor(private readonly licenceTypeRepository: LicenceTypeRepository) {}

  findAll() {
    return this.licenceTypeRepository.findAll();
  }

  async findOne(id: string) {
    const licenceType = await this.licenceTypeRepository.findOne(id);
    if (!licenceType) throw new NotFoundException(`LicenceType ${id} not found`);
    return licenceType;
  }
}
