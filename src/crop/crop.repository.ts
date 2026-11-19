import { Injectable } from '@nestjs/common';
import { CropType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CROP_SELECT } from './dto/crop.dto';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';

@Injectable()
export class CropRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCropDto) {
    return this.prisma.crop.create({ select: CROP_SELECT, data: dto });
  }

  findAll(cropType?: CropType) {
    return this.prisma.crop.findMany({
      select: CROP_SELECT,
      where: cropType ? { cropType } : undefined,
      orderBy: { descriptionES: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.crop.findUnique({ select: CROP_SELECT, where: { id } });
  }

  update(id: string, dto: UpdateCropDto) {
    return this.prisma.crop.update({ select: CROP_SELECT, where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.crop.delete({ select: CROP_SELECT, where: { id } });
  }
}
