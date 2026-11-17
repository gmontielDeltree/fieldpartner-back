import { Injectable, NotFoundException } from '@nestjs/common';
import { LicenceTypeRepository } from './licence-type.repository';
import { CreateLicenceTypeDto } from './dto/create-licence-type.dto';
import { UpdateLicenceTypeDto } from './dto/update-licence-type.dto';

@Injectable()
export class LicenceTypeService {
  constructor(private readonly licenceTypeRepository: LicenceTypeRepository) {}

  create(dto: CreateLicenceTypeDto) {
    return this.licenceTypeRepository.create(dto);
  }

  findAll() {
    return this.licenceTypeRepository.findAll();
  }

  async findOne(id: string) {
    const licenceType = await this.licenceTypeRepository.findOne(id);
    if (!licenceType) throw new NotFoundException(`LicenceType ${id} not found`);
    return licenceType;
  }

  async update(id: string, dto: UpdateLicenceTypeDto) {
    await this.findOne(id);
    return this.licenceTypeRepository.update(id, dto);
  }

  // Si el tipo está referenciado por licencias vigentes, el delete cae por FK
  // (P2003) y el GlobalExceptionFilter lo traduce; no se borra en cascada.
  async remove(id: string) {
    await this.findOne(id);
    return this.licenceTypeRepository.remove(id);
  }
}
