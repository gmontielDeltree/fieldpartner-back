import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTypeDeviceDto } from './dto/create-type-device.dto';
import { UpdateTypeDeviceDto } from './dto/update-type-device.dto';

@Injectable()
export class TypeDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTypeDeviceDto) {
    return this.prisma.typeDevice.create({ data: dto });
  }

  findAll() {
    return this.prisma.typeDevice.findMany({ orderBy: { model: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.typeDevice.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdateTypeDeviceDto) {
    return this.prisma.typeDevice.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.typeDevice.delete({ where: { id } });
  }
}
