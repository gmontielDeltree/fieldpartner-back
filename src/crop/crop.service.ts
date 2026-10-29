import { Injectable, NotFoundException } from '@nestjs/common';
import { CropType } from '@prisma/client';
import { CropRepository } from './crop.repository';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';

@Injectable()
export class CropService {
  constructor(private readonly cropRepository: CropRepository) {}

  create(dto: CreateCropDto) {
    return this.cropRepository.create(dto);
  }

  findAll(cropType?: CropType) {
    return this.cropRepository.findAll(cropType);
  }

  async findOne(id: string) {
    const crop = await this.cropRepository.findOne(id);
    if (!crop) throw new NotFoundException(`Crop ${id} not found`);
    return crop;
  }

  async update(id: string, dto: UpdateCropDto) {
    await this.findOne(id);
    return this.cropRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.cropRepository.remove(id);
  }
}
