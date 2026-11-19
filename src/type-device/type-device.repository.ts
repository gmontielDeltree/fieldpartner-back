import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TYPE_DEVICE_SELECT } from './dto/type-device.dto';
import { CreateTypeDeviceDto } from './dto/create-type-device.dto';
import { UpdateTypeDeviceDto } from './dto/update-type-device.dto';

@Injectable()
export class TypeDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTypeDeviceDto) {
    return this.prisma.typeDevice.create({ select: TYPE_DEVICE_SELECT, data: dto });
  }

  findAll() {
    return this.prisma.typeDevice.findMany({ select: TYPE_DEVICE_SELECT, orderBy: { model: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.typeDevice.findUnique({ select: TYPE_DEVICE_SELECT, where: { id } });
  }

  update(id: string, dto: UpdateTypeDeviceDto) {
    return this.prisma.typeDevice.update({ select: TYPE_DEVICE_SELECT, where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.typeDevice.delete({ select: TYPE_DEVICE_SELECT, where: { id } });
  }
}
