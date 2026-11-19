import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_SELECT, SystemDto } from './dto/system.dto';
import { CreateSystemDto } from './dto/create-system.dto';
import { UpdateSystemDto } from './dto/update-system.dto';

@Injectable()
export class SystemRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateSystemDto): Promise<SystemDto> {
    return this.prisma.system.create({ select: SYSTEM_SELECT, data: dto });
  }

  findAll(): Promise<SystemDto[]> {
    return this.prisma.system.findMany({
      select: SYSTEM_SELECT,
      orderBy: [{ name: 'asc' }, { version: 'asc' }],
    });
  }

  findOne(id: string): Promise<SystemDto | null> {
    return this.prisma.system.findUnique({ select: SYSTEM_SELECT, where: { id } });
  }

  update(id: string, dto: UpdateSystemDto): Promise<SystemDto> {
    return this.prisma.system.update({ select: SYSTEM_SELECT, where: { id }, data: dto });
  }

  remove(id: string): Promise<SystemDto> {
    return this.prisma.system.delete({ select: SYSTEM_SELECT, where: { id } });
  }
}
