import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Injectable()
export class ZoneRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateZoneDto) {
    return this.prisma.zone.create({ data: dto });
  }

  findAll(accountId: string) {
    return this.prisma.zone.findMany({
      where: { accountId },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.zone.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdateZoneDto) {
    return this.prisma.zone.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.zone.delete({ where: { id } });
  }
}
