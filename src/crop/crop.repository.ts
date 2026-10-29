import { Injectable } from '@nestjs/common';
import { CropType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';

@Injectable()
export class CropRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCropDto) {
    return this.prisma.crop.create({ data: dto });
  }

  findAll(cropType?: CropType) {
    return this.prisma.crop.findMany({
      where: cropType ? { cropType } : undefined,
      orderBy: { descriptionES: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.crop.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdateCropDto) {
    return this.prisma.crop.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.crop.delete({ where: { id } });
  }
}
