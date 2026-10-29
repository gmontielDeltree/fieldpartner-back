import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';

@Injectable()
export class FieldRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateFieldDto) {
    return this.prisma.field.create({
      data: dto,
      include: { lots: true, country: true },
    });
  }

  findAll(accountId: string) {
    return this.prisma.field.findMany({
      where: { accountId },
      include: { lots: true, country: true },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.field.findUnique({
      where: { id },
      include: { lots: true, country: true },
    });
  }

  update(id: string, dto: UpdateFieldDto) {
    return this.prisma.field.update({
      where: { id },
      data: dto,
      include: { lots: true, country: true },
    });
  }

  remove(id: string) {
    return this.prisma.field.delete({ where: { id } });
  }
}
