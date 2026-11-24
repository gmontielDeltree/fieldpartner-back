import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ZONE_SELECT, ZoneDto } from './dto/zone.dto';

@Injectable()
export class ZoneRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(accountId: string, dto: CreateZoneDto): Promise<ZoneDto> {
    return this.prisma.zone.create({ data: { ...dto, accountId }, select: ZONE_SELECT });
  }

  findAll(accountId: string): Promise<ZoneDto[]> {
    return this.prisma.zone.findMany({
      where: { accountId },
      select: ZONE_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  /** `accountId` undefined = no account filter (GENERAL_ADMIN). */
  findOne(id: string, accountId?: string): Promise<ZoneDto | null> {
    return this.prisma.zone.findFirst({
      where: { id, ...(accountId && { accountId }) },
      select: ZONE_SELECT,
    });
  }

  update(id: string, dto: UpdateZoneDto): Promise<ZoneDto> {
    return this.prisma.zone.update({ where: { id }, data: dto, select: ZONE_SELECT });
  }

  remove(id: string): Promise<ZoneDto> {
    return this.prisma.zone.delete({ where: { id }, select: ZONE_SELECT });
  }
}
